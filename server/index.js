import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import cors from 'cors'
import express from 'express'
import fs from 'node:fs'
import path from 'node:path'
import multer from 'multer'
import pg from 'pg'
import { fileURLToPath } from 'node:url'

const { Pool } = pg

const app = express()
const port = Number(process.env.PORT || 8788)
const databaseUrl = process.env.DATABASE_URL
const allowedOrigin = process.env.ALLOWED_ORIGIN || 'http://127.0.0.1:5173'
const r2AccountId = process.env.R2_ACCOUNT_ID
const r2AccessKeyId = process.env.R2_ACCESS_KEY_ID
const r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY
const r2BucketName = process.env.R2_BUCKET_NAME
const r2PublicBaseUrl = process.env.R2_PUBLIC_BASE_URL?.replace(/\/$/, '')
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const distDir = path.resolve(__dirname, '../dist')
const hasBuiltFrontend = fs.existsSync(path.join(distDir, 'index.html'))

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required before starting the backend.')
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl:
    process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false }
      : undefined,
})

const hasR2Config = Boolean(
  r2AccountId &&
    r2AccessKeyId &&
    r2SecretAccessKey &&
    r2BucketName &&
    r2PublicBaseUrl,
)

const r2Client = hasR2Config
  ? new S3Client({
      region: 'auto',
      endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: r2AccessKeyId,
        secretAccessKey: r2SecretAccessKey,
      },
    })
  : null

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
})
const photoFeedClients = new Set()

async function ensureDatabaseSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_visitors (
      ip_address TEXT PRIMARY KEY,
      last_opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS photo_captures (
      id BIGSERIAL PRIMARY KEY,
      object_key TEXT NOT NULL UNIQUE,
      image_url TEXT NOT NULL,
      caption TEXT NOT NULL DEFAULT '',
      ip_address TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `)

  await pool.query(`
    ALTER TABLE photo_captures
    ADD COLUMN IF NOT EXISTS likes_count INTEGER;
  `)

  await pool.query(`
    ALTER TABLE photo_captures
    ADD COLUMN IF NOT EXISTS visitor_identity TEXT;
  `)

  await pool.query(`
    UPDATE photo_captures
    SET visitor_identity = CONCAT('ip:', ip_address)
    WHERE visitor_identity IS NULL;
  `)

  await pool.query(`
    ALTER TABLE photo_captures
    ALTER COLUMN visitor_identity SET NOT NULL;
  `)

  await pool.query(`
    ALTER TABLE photo_captures
    ADD COLUMN IF NOT EXISTS uploader_name TEXT;
  `)

  await pool.query(`
    UPDATE photo_captures
    SET uploader_name = 'Guest'
    WHERE uploader_name IS NULL;
  `)

  await pool.query(`
    ALTER TABLE photo_captures
    ALTER COLUMN uploader_name SET NOT NULL;
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS photo_capture_likes (
      photo_capture_id BIGINT NOT NULL REFERENCES photo_captures(id) ON DELETE CASCADE,
      ip_address TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (photo_capture_id, ip_address)
    );
  `)

  await pool.query(`
    ALTER TABLE photo_capture_likes
    ADD COLUMN IF NOT EXISTS visitor_identity TEXT;
  `)

  await pool.query(`
    UPDATE photo_capture_likes
    SET visitor_identity = CONCAT('ip:', ip_address)
    WHERE visitor_identity IS NULL;
  `)

  await pool.query(`
    ALTER TABLE photo_capture_likes
    ALTER COLUMN visitor_identity SET NOT NULL;
  `)

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS photo_capture_likes_photo_identity_idx
    ON photo_capture_likes (photo_capture_id, visitor_identity);
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS profiles (
      id BIGSERIAL PRIMARY KEY,
      uuid TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      object_key TEXT UNIQUE,
      url_profile_pic TEXT
    );
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS photo_capture_comments (
      id BIGSERIAL PRIMARY KEY,
      photo_capture_id BIGINT NOT NULL REFERENCES photo_captures(id) ON DELETE CASCADE,
      visitor_identity TEXT NOT NULL,
      profile_uuid TEXT REFERENCES profiles(uuid) ON DELETE SET NULL,
      body TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `)

  await pool.query(`
    CREATE INDEX IF NOT EXISTS photo_capture_comments_photo_created_idx
    ON photo_capture_comments (photo_capture_id, created_at ASC, id ASC);
  `)

  await pool.query(`
    ALTER TABLE photo_captures
    ADD COLUMN IF NOT EXISTS comments_count INTEGER NOT NULL DEFAULT 0;
  `)
  
  await pool.query(`
    ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS uuid TEXT;
  `)

  await pool.query(`
    ALTER TABLE profiles
    ALTER COLUMN object_key DROP NOT NULL;
  `)

  await pool.query(`
    ALTER TABLE profiles
    ALTER COLUMN url_profile_pic DROP NOT NULL;
  `)
  
  await pool.query(`
    ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS verified BOOLEAN NOT NULL DEFAULT FALSE;
  `)
  
  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'profiles_uuid_key'
      ) THEN
        ALTER TABLE profiles
        ADD CONSTRAINT profiles_uuid_key UNIQUE (uuid);
      END IF;
    END
    $$;
  `)

  await pool.query(`
    INSERT INTO profiles (uuid, name)
    SELECT
      codes.uuid,
      CASE
        WHEN LOWER(TRIM(codes.code)) = 'guest' THEN 'Guest'
        ELSE INITCAP(SPLIT_PART(codes.code, '_', 1))
      END
    FROM codes
    LEFT JOIN profiles
      ON profiles.uuid = codes.uuid
    WHERE profiles.uuid IS NULL
      AND codes.uuid IS NOT NULL
      AND TRIM(codes.uuid) <> ''
      AND codes.code IS NOT NULL
      AND TRIM(codes.code) <> '';
  `)
}

app.set('trust proxy', true)
app.use(
  cors({
    origin: allowedOrigin,
  }),
)
app.use(express.json())

if (hasBuiltFrontend) {
  app.use(express.static(distDir))
}

function getRequestIpAddress(request) {
  const forwardedFor = request.headers['x-forwarded-for']

  if (typeof forwardedFor === 'string' && forwardedFor.length > 0) {
    return forwardedFor.split(',')[0].trim()
  }

  return request.ip || request.socket?.remoteAddress || 'unknown'
}

function getRequestClientId(request) {
  const headerClientId = request.headers['x-client-id']

  if (typeof headerClientId === 'string' && headerClientId.trim()) {
    return headerClientId.trim()
  }

  const queryClientId = request.query?.clientId

  if (typeof queryClientId === 'string' && queryClientId.trim()) {
    return queryClientId.trim()
  }

  return getRequestIpAddress(request)
}

function getRequestVisitorIdentity(request) {
  const accessCodeUuid = request.headers['x-access-code-uuid']

  if (typeof accessCodeUuid === 'string' && accessCodeUuid.trim()) {
    return `code:${accessCodeUuid.trim()}`
  }

  return `ip:${getRequestIpAddress(request)}`
}

function getGuestNameFromAccessCode(code = '') {
  const normalizedCode = String(code).trim()

  if (normalizedCode.toLowerCase() === 'guest') {
    return 'Guest'
  }

  const rawName = normalizedCode.split('_')[0]?.trim()

  if (!rawName) {
    return 'Guest'
  }

  return rawName.charAt(0).toUpperCase() + rawName.slice(1).toLowerCase()
}

async function ensureProfileExistsForCodeRow(codeRow) {
  const accessCodeUuid =
    typeof codeRow?.uuid === 'string' ? codeRow.uuid.trim() : ''
  const accessCode = typeof codeRow?.code === 'string' ? codeRow.code.trim() : ''

  if (!accessCodeUuid || !accessCode) {
    return
  }

  await pool.query(
    `
      INSERT INTO profiles (uuid, name)
      VALUES ($1, $2)
      ON CONFLICT (uuid)
      DO NOTHING
    `,
    [accessCodeUuid, getGuestNameFromAccessCode(accessCode)],
  )
}

async function getProfileByUuid(accessCodeUuid) {
  if (!accessCodeUuid) {
    return null
  }

  const result = await pool.query(
    `
      SELECT id, uuid, name, object_key, url_profile_pic, verified
      FROM profiles
      WHERE uuid = $1
      LIMIT 1
    `,
    [accessCodeUuid],
  )

  if (result.rowCount === 0) {
    return null
  }

  return {
    id: String(result.rows[0].id),
    uuid: result.rows[0].uuid,
    name: result.rows[0].name,
    objectKey: result.rows[0].object_key,
    urlProfilePic: result.rows[0].url_profile_pic,
    verified: Boolean(result.rows[0].verified),
  }
}

async function isValidAccessCodeUuid(accessCodeUuid) {
  if (!accessCodeUuid) {
    return false
  }

  const result = await pool.query(
    `
      SELECT 1
      FROM codes
      WHERE uuid = $1
      LIMIT 1
    `,
    [accessCodeUuid],
  )

  return result.rowCount > 0
}

function getSafeFileExtension(filename = '', mimeType = '') {
  const extensionFromName = filename.split('.').pop()?.toLowerCase()

  if (extensionFromName && /^[a-z0-9]+$/.test(extensionFromName)) {
    return extensionFromName
  }

  if (mimeType === 'image/png') {
    return 'png'
  }

  if (mimeType === 'image/webp') {
    return 'webp'
  }

  return 'jpg'
}

function buildPublicImageUrl(objectKey, fallbackImageUrl = '') {
  if (r2PublicBaseUrl && objectKey) {
    return `${r2PublicBaseUrl}/${objectKey}`
  }

  return fallbackImageUrl
}

function sendSseEvent(response, eventName, payload) {
  response.write(`event: ${eventName}\n`)
  response.write(`data: ${JSON.stringify(payload)}\n\n`)
}

function broadcastPhotoLikeUpdate({
  sourceClientId,
  photoId,
  likesCount,
  likedByCurrentVisitor,
}) {
  for (const client of photoFeedClients) {
    const payload = {
      id: String(photoId),
      likesCount,
    }

    if (client.clientId === sourceClientId) {
      payload.likedByCurrentVisitor = likedByCurrentVisitor
    }

    sendSseEvent(client.response, 'photo-like-updated', payload)
  }
}

function broadcastPhotoCreated({
  sourceClientId,
  photoId,
}) {
  for (const client of photoFeedClients) {
    sendSseEvent(client.response, 'photo-created', {
      id: String(photoId),
      createdByCurrentVisitor: client.clientId === sourceClientId,
    })
  }
}

app.get('/api/health', async (_request, response) => {
  try {
    await pool.query('SELECT 1')
    response.status(200).json({ ok: true, r2Configured: hasR2Config })
  } catch (error) {
    response.status(500).json({
      ok: false,
      error:
        error instanceof Error ? error.message : 'Database health check failed.',
    })
  }
})

app.get('/api/photos', async (request, response) => {
  const visitorIdentity = getRequestVisitorIdentity(request)
  const limit = Math.min(Math.max(Number(request.query.limit) || 12, 1), 50)
  const offset = Math.max(Number(request.query.offset) || 0, 0)

  try {
    const result = await pool.query(
      `
        SELECT
          photo_captures.id,
          photo_captures.object_key,
          photo_captures.image_url,
          photo_captures.caption,
          photo_captures.ip_address,
          COALESCE(profiles.name, photo_captures.uploader_name) AS uploader_name,
          profiles.uuid AS uploader_uuid,
          profiles.url_profile_pic,
          COALESCE(profiles.verified, FALSE) AS uploader_verified,
          photo_captures.created_at,
          photo_captures.likes_count,
          COALESCE(like_preview.liker_names, ARRAY[]::TEXT[]) AS liker_names,
          COALESCE(like_preview.liker_preview, '[]'::JSON) AS liker_preview,
          photo_capture_likes.photo_capture_id IS NOT NULL AS liked_by_current_visitor,
          photo_captures.comments_count
        FROM photo_captures
        LEFT JOIN photo_capture_likes
          ON photo_capture_likes.photo_capture_id = photo_captures.id
          AND photo_capture_likes.visitor_identity = $1
        LEFT JOIN LATERAL (
          SELECT
            ARRAY_AGG(named_likes.name ORDER BY named_likes.created_at DESC) AS liker_names,
            JSON_AGG(
              JSON_BUILD_OBJECT(
                'name', named_likes.name,
                'profileImageUrl', COALESCE(named_likes.url_profile_pic, '')
              )
              ORDER BY named_likes.created_at DESC
            ) AS liker_preview
          FROM (
            SELECT profiles.name, profiles.url_profile_pic, photo_capture_likes.created_at
            FROM photo_capture_likes
            JOIN profiles
              ON photo_capture_likes.visitor_identity LIKE 'code:%'
              AND profiles.uuid = SUBSTRING(photo_capture_likes.visitor_identity FROM 6)
            WHERE photo_capture_likes.photo_capture_id = photo_captures.id
              AND TRIM(profiles.name) <> ''
            ORDER BY photo_capture_likes.created_at DESC
            LIMIT 2
          ) AS named_likes
        ) AS like_preview
          ON TRUE
        LEFT JOIN profiles
          ON photo_captures.visitor_identity LIKE 'code:%'
          AND profiles.uuid = SUBSTRING(photo_captures.visitor_identity FROM 6)
        ORDER BY photo_captures.created_at DESC
        LIMIT $2
        OFFSET $3
      `,
      [visitorIdentity, limit + 1, offset],
    )

    const rowsToReturn = result.rows.slice(0, limit)

    response.status(200).json({
      ok: true,
      hasMore: result.rows.length > limit,
      nextOffset: result.rows.length > limit ? offset + rowsToReturn.length : null,
      photos: rowsToReturn.map((row) => ({
        id: String(row.id),
        key: row.object_key,
        imageUrl: buildPublicImageUrl(row.object_key, row.image_url),
        caption: row.caption,
        likesCount: row.likes_count,
        likerNames: Array.isArray(row.liker_names) ? row.liker_names : [],
        likerPreview: Array.isArray(row.liker_preview) ? row.liker_preview : [],
        likedByCurrentVisitor: row.liked_by_current_visitor,
        ipAddress: row.ip_address,
        uploaderName: row.uploader_name,
        uploaderUuid: row.uploader_uuid,
        profileImageUrl: row.url_profile_pic,
        uploaderVerified: Boolean(row.uploader_verified),
        createdAt: row.created_at,
        commentsCount: row.comments_count,
      })),
    })
  } catch (error) {
    response.status(500).json({
      ok: false,
      error:
        error instanceof Error ? error.message : 'Failed to load saved photos.',
    })
  }
})

app.get('/api/profiles', async (request, response) => {
  const accessCodeUuid =
    typeof request.headers['x-access-code-uuid'] === 'string'
      ? request.headers['x-access-code-uuid'].trim()
      : ''

  if (!accessCodeUuid) {
    response.status(401).json({
      ok: false,
      error: 'Access code is required.',
    })
    return
  }

  try {
    if (!(await isValidAccessCodeUuid(accessCodeUuid))) {
      response.status(403).json({
        ok: false,
        error: 'Invalid access code session.',
      })
      return
    }

    const result = await pool.query(
      `
        SELECT
          profiles.id,
          profiles.uuid,
          profiles.name,
          profiles.object_key,
          profiles.url_profile_pic,
          profiles.verified,
          GREATEST(
            COALESCE(photo_activity.last_created_at, '-infinity'::timestamptz),
            COALESCE(like_activity.last_created_at, '-infinity'::timestamptz),
            COALESCE(comment_activity.last_created_at, '-infinity'::timestamptz)
          ) AS last_active_at
        FROM profiles
        LEFT JOIN LATERAL (
          SELECT MAX(created_at) AS last_created_at
          FROM photo_captures
          WHERE visitor_identity = CONCAT('code:', profiles.uuid)
        ) AS photo_activity
          ON TRUE
        LEFT JOIN LATERAL (
          SELECT MAX(created_at) AS last_created_at
          FROM photo_capture_likes
          WHERE visitor_identity = CONCAT('code:', profiles.uuid)
        ) AS like_activity
          ON TRUE
        LEFT JOIN LATERAL (
          SELECT MAX(created_at) AS last_created_at
          FROM photo_capture_comments
          WHERE profile_uuid = profiles.uuid
        ) AS comment_activity
          ON TRUE
        WHERE uuid IS NOT NULL
          AND TRIM(uuid) <> ''
        ORDER BY LOWER(name) ASC, id ASC
      `,
    )

    response.status(200).json({
      ok: true,
      profiles: result.rows.map((row) => ({
        id: String(row.id),
        uuid: row.uuid,
        name: row.name,
        objectKey: row.object_key,
        urlProfilePic: row.url_profile_pic,
        verified: Boolean(row.verified),
        lastActiveAt:
          row.last_active_at && row.last_active_at !== '-infinity'
            ? row.last_active_at
            : null,
      })),
    })
  } catch (error) {
    response.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : 'Failed to load profiles.',
    })
  }
})

app.get('/api/photos/stream', (request, response) => {
  const client = {
    clientId: getRequestClientId(request),
    response,
  }

  response.setHeader('Content-Type', 'text/event-stream')
  response.setHeader('Cache-Control', 'no-cache, no-transform')
  response.setHeader('Connection', 'keep-alive')
  response.flushHeaders?.()

  photoFeedClients.add(client)
  sendSseEvent(response, 'connected', { ok: true })

  const keepAlive = setInterval(() => {
    sendSseEvent(response, 'ping', {})
  }, 25000)

  request.on('close', () => {
    clearInterval(keepAlive)
    photoFeedClients.delete(client)
    response.end()
  })
})

app.post('/api/visitors', async (request, response) => {
  const ipAddress = getRequestIpAddress(request)

  try {
    const result = await pool.query(
      `
        INSERT INTO app_visitors (ip_address, last_opened_at)
        VALUES ($1, NOW())
        ON CONFLICT (ip_address)
        DO UPDATE SET last_opened_at = EXCLUDED.last_opened_at
        RETURNING ip_address, last_opened_at
      `,
      [ipAddress],
    )

    response.status(200).json({
      ok: true,
      visitor: result.rows[0],
    })
  } catch (error) {
    response.status(500).json({
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to save visitor open event.',
    })
  }
})

app.post('/api/photos', upload.single('file'), async (request, response) => {
  if (!hasR2Config || !r2Client || !r2BucketName || !r2PublicBaseUrl) {
    response.status(500).json({
      ok: false,
      error:
        'R2 is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, and R2_PUBLIC_BASE_URL in .env.',
    })
    return
  }

  const file = request.file
  const caption =
    typeof request.body.caption === 'string' ? request.body.caption.trim() : ''
  const clientId = getRequestClientId(request)
  const ipAddress = getRequestIpAddress(request)
  const visitorIdentity = getRequestVisitorIdentity(request)
  const accessCodeUuid =
    typeof request.headers['x-access-code-uuid'] === 'string'
      ? request.headers['x-access-code-uuid'].trim()
      : ''

  if (!file) {
    response.status(400).json({
      ok: false,
      error: 'No image file was uploaded.',
    })
    return
  }

  try {
    const extension = getSafeFileExtension(file.originalname, file.mimetype)
    const objectKey = `wedding-photos/${Date.now()}-${crypto.randomUUID()}.${extension}`
    let uploaderName = 'Guest'
    let profileImageUrl = null
    let uploaderVerified = false

    if (accessCodeUuid) {
      const codeResult = await pool.query(
        `
          SELECT codes.code, profiles.name, profiles.url_profile_pic, profiles.verified
          FROM codes
          LEFT JOIN profiles
            ON profiles.uuid = codes.uuid
          WHERE codes.uuid = $1
          LIMIT 1
        `,
        [accessCodeUuid],
      )

      if (codeResult.rowCount > 0) {
        uploaderName =
          codeResult.rows[0].name || getGuestNameFromAccessCode(codeResult.rows[0].code)
        profileImageUrl = codeResult.rows[0].url_profile_pic || null
        uploaderVerified = Boolean(codeResult.rows[0].verified)
      }
    }

    await r2Client.send(
      new PutObjectCommand({
        Bucket: r2BucketName,
        Key: objectKey,
        Body: file.buffer,
        ContentType: file.mimetype || 'image/jpeg',
      }),
    )

    const imageUrl = buildPublicImageUrl(objectKey)
    const result = await pool.query(
      `
        INSERT INTO photo_captures (
          object_key,
          image_url,
          caption,
          ip_address,
          visitor_identity,
          uploader_name,
          created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        RETURNING id, object_key, image_url, caption, ip_address, uploader_name, created_at, likes_count, comments_count
      `,
      [objectKey, imageUrl, caption, ipAddress, visitorIdentity, uploaderName],
    )

    response.status(200).json({
      ok: true,
      id: result.rows[0].id,
      key: result.rows[0].object_key,
      imageUrl: result.rows[0].image_url,
      caption: result.rows[0].caption,
      likesCount: result.rows[0].likes_count,
      ipAddress: result.rows[0].ip_address,
      uploaderName: result.rows[0].uploader_name,
      uploaderUuid: accessCodeUuid || null,
      profileImageUrl,
      uploaderVerified,
      createdAt: result.rows[0].created_at,
      commentsCount: result.rows[0].comments_count,
    })

    broadcastPhotoCreated({
      sourceClientId: clientId,
      photoId: result.rows[0].id,
    })
  } catch (error) {
    response.status(500).json({
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to upload photo and save metadata.',
    })
  }
})

app.post('/api/photos/:id/like', async (request, response) => {
  const { id } = request.params
  const clientId = getRequestClientId(request)
  const ipAddress = getRequestIpAddress(request)
  const visitorIdentity = getRequestVisitorIdentity(request)
  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    const photoResult = await client.query(
      `
        SELECT id
        FROM photo_captures
        WHERE id = $1
        FOR UPDATE
      `,
      [id],
    )

    if (photoResult.rowCount === 0) {
      await client.query('ROLLBACK')
      response.status(404).json({
        ok: false,
        error: 'Photo not found.',
      })
      return
    }

    const result = await client.query(
      `
        WITH inserted_like AS (
          INSERT INTO photo_capture_likes (photo_capture_id, ip_address, visitor_identity)
          VALUES ($1, $2, $3)
          ON CONFLICT (photo_capture_id, visitor_identity) DO NOTHING
          RETURNING photo_capture_id
        )
        UPDATE photo_captures
        SET likes_count = CASE
          WHEN EXISTS (SELECT 1 FROM inserted_like)
            THEN COALESCE(likes_count, 0) + 1
          ELSE likes_count
        END
        WHERE id = $1
        RETURNING id, likes_count
      `,
      [id, ipAddress, visitorIdentity],
    )

    await client.query('COMMIT')

    response.status(200).json({
      ok: true,
      id: String(result.rows[0].id),
      likesCount: result.rows[0].likes_count,
      likedByCurrentVisitor: true,
    })

    broadcastPhotoLikeUpdate({
      sourceClientId: clientId,
      photoId: result.rows[0].id,
      likesCount: result.rows[0].likes_count,
      likedByCurrentVisitor: true,
    })
  } catch (error) {
    await client.query('ROLLBACK')
    response.status(500).json({
      ok: false,
      error:
        error instanceof Error ? error.message : 'Failed to like photo.',
    })
  } finally {
    client.release()
  }
})

app.delete('/api/photos/:id/like', async (request, response) => {
  const { id } = request.params
  const clientId = getRequestClientId(request)
  const visitorIdentity = getRequestVisitorIdentity(request)
  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    const photoResult = await client.query(
      `
        SELECT id
        FROM photo_captures
        WHERE id = $1
        FOR UPDATE
      `,
      [id],
    )

    if (photoResult.rowCount === 0) {
      await client.query('ROLLBACK')
      response.status(404).json({
        ok: false,
        error: 'Photo not found.',
      })
      return
    }

    const result = await client.query(
      `
        WITH deleted_like AS (
          DELETE FROM photo_capture_likes
          WHERE photo_capture_id = $1
            AND visitor_identity = $2
          RETURNING photo_capture_id
        )
        UPDATE photo_captures
        SET likes_count = CASE
          WHEN EXISTS (SELECT 1 FROM deleted_like)
            THEN NULLIF(GREATEST(COALESCE(likes_count, 0) - 1, 0), 0)
          ELSE likes_count
        END
        WHERE id = $1
        RETURNING id, likes_count
      `,
      [id, visitorIdentity],
    )

    await client.query('COMMIT')

    response.status(200).json({
      ok: true,
      id: String(result.rows[0].id),
      likesCount: result.rows[0].likes_count,
      likedByCurrentVisitor: false,
    })

    broadcastPhotoLikeUpdate({
      sourceClientId: clientId,
      photoId: result.rows[0].id,
      likesCount: result.rows[0].likes_count,
      likedByCurrentVisitor: false,
    })
  } catch (error) {
    await client.query('ROLLBACK')
    response.status(500).json({
      ok: false,
      error:
        error instanceof Error ? error.message : 'Failed to unlike photo.',
    })
  } finally {
    client.release()
  }
})

app.delete('/api/photos/:id', async (request, response) => {
  const { id } = request.params
  const accessCodeUuid = getAccessCodeUuid(request)
  const visitorIdentity = getRequestVisitorIdentity(request)

  if (!accessCodeUuid || isAnonymousAccessCodeUuid(accessCodeUuid)) {
    response.status(401).json({
      ok: false,
      error: 'Login is required to delete a post.',
    })
    return
  }

  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    const photoResult = await client.query(
      `
        SELECT id, object_key, visitor_identity
        FROM photo_captures
        WHERE id = $1
        FOR UPDATE
      `,
      [id],
    )

    if (photoResult.rowCount === 0) {
      await client.query('ROLLBACK')
      response.status(404).json({
        ok: false,
        error: 'Photo not found.',
      })
      return
    }

    const photo = photoResult.rows[0]

    if (photo.visitor_identity !== visitorIdentity) {
      await client.query('ROLLBACK')
      response.status(403).json({
        ok: false,
        error: 'You can only delete your own post.',
      })
      return
    }

    await client.query(
      `
        DELETE FROM photo_captures
        WHERE id = $1
      `,
      [id],
    )

    await client.query('COMMIT')

    if (photo.object_key && hasR2Config && r2Client && r2BucketName) {
      try {
        await r2Client.send(
          new DeleteObjectCommand({
            Bucket: r2BucketName,
            Key: photo.object_key,
          }),
        )
      } catch (error) {
        console.error('Failed to delete photo from R2:', error)
      }
    }

    response.status(200).json({
      ok: true,
      id: String(id),
    })
  } catch (error) {
    await client.query('ROLLBACK')
    response.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : 'Failed to delete photo.',
    })
  } finally {
    client.release()
  }
})

function getAccessCodeUuid(request) {
  const accessCodeUuid = request.headers['x-access-code-uuid']

  return typeof accessCodeUuid === 'string' && accessCodeUuid.trim()
    ? accessCodeUuid.trim()
    : ''
}

function isAnonymousAccessCodeUuid(accessCodeUuid) {
  return accessCodeUuid === '4a2e7030-e779-4572-9868-5cb073d6a58d'
}

function mapCommentRow(row, currentVisitorIdentity) {
  return {
    id: String(row.id),
    photoId: String(row.photo_capture_id),
    body: row.body,
    authorName: row.author_name || 'Guest',
    authorUuid: row.profile_uuid || '',
    authorProfileImageUrl: row.url_profile_pic || '',
    authorVerified: Boolean(row.author_verified),
    ownedByCurrentVisitor: row.visitor_identity === currentVisitorIdentity,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

app.get('/api/photos/:id/comments', async (request, response) => {
  const { id } = request.params
  const visitorIdentity = getRequestVisitorIdentity(request)

  try {
    const result = await pool.query(
      `
        SELECT
          photo_capture_comments.id,
          photo_capture_comments.photo_capture_id,
          photo_capture_comments.visitor_identity,
          photo_capture_comments.profile_uuid,
          photo_capture_comments.body,
          photo_capture_comments.created_at,
          photo_capture_comments.updated_at,
          profiles.name AS author_name,
          profiles.url_profile_pic,
          COALESCE(profiles.verified, FALSE) AS author_verified
        FROM photo_capture_comments
        LEFT JOIN profiles
          ON profiles.uuid = photo_capture_comments.profile_uuid
        WHERE photo_capture_comments.photo_capture_id = $1
        ORDER BY photo_capture_comments.created_at ASC, photo_capture_comments.id ASC
      `,
      [id],
    )

    response.status(200).json({
      ok: true,
      comments: result.rows.map((row) => mapCommentRow(row, visitorIdentity)),
    })
  } catch (error) {
    response.status(500).json({
      ok: false,
      error:
        error instanceof Error ? error.message : 'Failed to load comments.',
    })
  }
})

app.get('/api/photos/:id/likes', async (request, response) => {
  const { id } = request.params

  try {
    const photoResult = await pool.query(
      `
        SELECT id
        FROM photo_captures
        WHERE id = $1
        LIMIT 1
      `,
      [id],
    )

    if (photoResult.rowCount === 0) {
      response.status(404).json({
        ok: false,
        error: 'Photo not found.',
      })
      return
    }

    const result = await pool.query(
      `
        SELECT
          profiles.uuid,
          profiles.name,
          profiles.url_profile_pic,
          COALESCE(profiles.verified, FALSE) AS verified,
          photo_capture_likes.created_at
        FROM photo_capture_likes
        JOIN profiles
          ON photo_capture_likes.visitor_identity LIKE 'code:%'
          AND profiles.uuid = SUBSTRING(photo_capture_likes.visitor_identity FROM 6)
        WHERE photo_capture_likes.photo_capture_id = $1
          AND TRIM(profiles.name) <> ''
        ORDER BY photo_capture_likes.created_at DESC, profiles.name ASC
      `,
      [id],
    )

    response.status(200).json({
      ok: true,
      likes: result.rows.map((row) => ({
        uuid: row.uuid || '',
        name: row.name || 'Guest',
        profileImageUrl: row.url_profile_pic || '',
        verified: Boolean(row.verified),
        createdAt: row.created_at,
      })),
    })
  } catch (error) {
    response.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : 'Failed to load likes.',
    })
  }
})

app.post('/api/photos/:id/comments', async (request, response) => {
  const { id } = request.params
  const body = typeof request.body?.body === 'string' ? request.body.body.trim() : ''
  const accessCodeUuid = getAccessCodeUuid(request)
  const visitorIdentity = getRequestVisitorIdentity(request)

  if (!accessCodeUuid) {
    response.status(401).json({
      ok: false,
      error: 'Login is required to comment.',
    })
    return
  }

  const client = await pool.connect()
  
  if (!body) {
    response.status(400).json({
      ok: false,
      error: 'Comment cannot be empty.',
    })
    return
  }

  if (body.length > 500) {
    response.status(400).json({
      ok: false,
      error: 'Comment must be 500 characters or fewer.',
    })
    return
  }

  try {
    await client.query('BEGIN')

    const profileResult = await client.query(
      `
        SELECT uuid
        FROM profiles
        WHERE uuid = $1
        LIMIT 1
      `,
      [accessCodeUuid],
    )

    if (profileResult.rowCount === 0) {
      await client.query('ROLLBACK')
      response.status(404).json({
        ok: false,
        error: 'Profile not found.',
      })
      return
    }

    const photoResult = await client.query(
      `
        SELECT id
        FROM photo_captures
        WHERE id = $1
        FOR UPDATE
      `,
      [id],
    )

    if (photoResult.rowCount === 0) {
      await client.query('ROLLBACK')
      response.status(404).json({
        ok: false,
        error: 'Photo not found.',
      })
      return
    }

    const insertResult = await client.query(
      `
        INSERT INTO photo_capture_comments (
          photo_capture_id,
          visitor_identity,
          profile_uuid,
          body
        )
        VALUES ($1, $2, $3, $4)
        RETURNING id
      `,
      [id, visitorIdentity, accessCodeUuid, body],
    )

    const countResult = await client.query(
      `
        UPDATE photo_captures
        SET comments_count = COALESCE(comments_count, 0) + 1
        WHERE id = $1
        RETURNING comments_count
      `,
      [id],
    )

    const commentResult = await client.query(
      `
        SELECT
          photo_capture_comments.id,
          photo_capture_comments.photo_capture_id,
          photo_capture_comments.visitor_identity,
          photo_capture_comments.profile_uuid,
          photo_capture_comments.body,
          photo_capture_comments.created_at,
          photo_capture_comments.updated_at,
          profiles.name AS author_name,
          profiles.url_profile_pic,
          COALESCE(profiles.verified, FALSE) AS author_verified
        FROM photo_capture_comments
        LEFT JOIN profiles
          ON profiles.uuid = photo_capture_comments.profile_uuid
        WHERE photo_capture_comments.id = $1
        LIMIT 1
      `,
      [insertResult.rows[0].id],
    )

    await client.query('COMMIT')

    response.status(201).json({
      ok: true,
      commentsCount: countResult.rows[0].comments_count,
      comment: mapCommentRow(commentResult.rows[0], visitorIdentity),
    })
  } catch (error) {
    await client.query('ROLLBACK')
    response.status(500).json({
      ok: false,
      error:
        error instanceof Error ? error.message : 'Failed to add comment.',
    })
  } finally {
    client.release()
  }
})

app.patch('/api/photos/:photoId/comments/:commentId', async (request, response) => {
  const { photoId, commentId } = request.params
  const body = typeof request.body?.body === 'string' ? request.body.body.trim() : ''
  const visitorIdentity = getRequestVisitorIdentity(request)

  if (!body) {
    response.status(400).json({
      ok: false,
      error: 'Comment cannot be empty.',
    })
    return
  }

  if (body.length > 500) {
    response.status(400).json({
      ok: false,
      error: 'Comment must be 500 characters or fewer.',
    })
    return
  }

  try {
    const result = await pool.query(
      `
        UPDATE photo_capture_comments
        SET body = $1,
            updated_at = NOW()
        WHERE id = $2
          AND photo_capture_id = $3
          AND visitor_identity = $4
        RETURNING id
      `,
      [body, commentId, photoId, visitorIdentity],
    )

    if (result.rowCount === 0) {
      response.status(404).json({
        ok: false,
        error: 'Comment not found or you do not own this comment.',
      })
      return
    }

    const commentResult = await pool.query(
      `
        SELECT
          photo_capture_comments.id,
          photo_capture_comments.photo_capture_id,
          photo_capture_comments.visitor_identity,
          photo_capture_comments.profile_uuid,
          photo_capture_comments.body,
          photo_capture_comments.created_at,
          photo_capture_comments.updated_at,
          profiles.name AS author_name,
          profiles.url_profile_pic,
          COALESCE(profiles.verified, FALSE) AS author_verified
        FROM photo_capture_comments
        LEFT JOIN profiles
          ON profiles.uuid = photo_capture_comments.profile_uuid
        WHERE photo_capture_comments.id = $1
        LIMIT 1
      `,
      [commentId],
    )

    response.status(200).json({
      ok: true,
      comment: mapCommentRow(commentResult.rows[0], visitorIdentity),
    })
  } catch (error) {
    response.status(500).json({
      ok: false,
      error:
        error instanceof Error ? error.message : 'Failed to update comment.',
    })
  }
})

app.delete('/api/photos/:photoId/comments/:commentId', async (request, response) => {
  const { photoId, commentId } = request.params
  const visitorIdentity = getRequestVisitorIdentity(request)
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    const deleteResult = await client.query(
      `
        DELETE FROM photo_capture_comments
        WHERE id = $1
          AND photo_capture_id = $2
          AND visitor_identity = $3
        RETURNING id
      `,
      [commentId, photoId, visitorIdentity],
    )

    if (deleteResult.rowCount === 0) {
      await client.query('ROLLBACK')
      response.status(404).json({
        ok: false,
        error: 'Comment not found or you do not own this comment.',
      })
      return
    }

    const countResult = await client.query(
      `
        UPDATE photo_captures
        SET comments_count = GREATEST(COALESCE(comments_count, 0) - 1, 0)
        WHERE id = $1
        RETURNING comments_count
      `,
      [photoId],
    )

    await client.query('COMMIT')

    response.status(200).json({
      ok: true,
      id: String(commentId),
      photoId: String(photoId),
      commentsCount: countResult.rows[0].comments_count,
    })
  } catch (error) {
    await client.query('ROLLBACK')
    response.status(500).json({
      ok: false,
      error:
        error instanceof Error ? error.message : 'Failed to delete comment.',
    })
  } finally {
    client.release()
  }
})

app.post('/api/access-codes/verify', async (request, response) => {
  const code = typeof request.body?.code === 'string' ? request.body.code.trim() : ''

  if (!code) {
    response.status(400).json({
      ok: false,
      error: 'Access code is required.',
    })
    return
  }

  try {
    const result = await pool.query(
      `
        SELECT uuid, code
        FROM codes
        WHERE code = $1
        LIMIT 1
      `,
      [code],
    )

    const verifiedCode = result.rows[0]?.code || ''
    let profile = null

    if (result.rowCount > 0) {
      await ensureProfileExistsForCodeRow(result.rows[0])
      profile = await getProfileByUuid(result.rows[0].uuid)
    }

    response.status(200).json({
      ok: true,
      valid: result.rowCount > 0,
      accessCodeUuid:
        typeof result.rows[0]?.uuid === 'string' && result.rows[0].uuid.trim()
          ? result.rows[0].uuid.trim()
          : null,
      guestName:
        result.rowCount > 0 ? profile?.name || getGuestNameFromAccessCode(verifiedCode) : null,
      profile,
    })
  } catch (error) {
    response.status(500).json({
      ok: false,
      error:
        error instanceof Error ? error.message : 'Failed to verify access code.',
    })
  }
})

app.post('/api/access-codes/verify-session', async (request, response) => {
  const accessCodeUuid =
    typeof request.body?.accessCodeUuid === 'string'
      ? request.body.accessCodeUuid.trim()
      : ''

  if (!accessCodeUuid) {
    response.status(400).json({
      ok: false,
      error: 'Access code UUID is required.',
    })
    return
  }

  try {
    const result = await pool.query(
      `
        SELECT uuid, code
        FROM codes
        WHERE uuid = $1
        LIMIT 1
      `,
      [accessCodeUuid],
    )

    let profile = null

    if (result.rowCount > 0) {
      await ensureProfileExistsForCodeRow(result.rows[0])
      profile = await getProfileByUuid(result.rows[0].uuid)
    }

    response.status(200).json({
      ok: true,
      valid: result.rowCount > 0,
      guestName:
        result.rowCount > 0
          ? profile?.name || getGuestNameFromAccessCode(result.rows[0].code)
          : null,
      profile,
    })
  } catch (error) {
    response.status(500).json({
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to verify access code session.',
    })
  }
})

app.post('/api/profiles', upload.single('file'), async (request, response) => {
  const file = request.file
  const requestedUuid =
    typeof request.body.uuid === 'string'
      ? request.body.uuid.trim()
      : typeof request.headers['x-access-code-uuid'] === 'string'
        ? request.headers['x-access-code-uuid'].trim()
        : ''
  const requestedName =
    typeof request.body.name === 'string' ? request.body.name.trim() : ''
  if (!requestedUuid) {
    response.status(400).json({
      ok: false,
      error: 'Profile uuid is required.',
    })
    return
  }

  if (!file && !requestedName) {
    response.status(400).json({
      ok: false,
      error: 'Profile name or profile picture is required.',
    })
    return
  }

  try {
    const codeResult = await pool.query(
      `
        SELECT uuid, code
        FROM codes
        WHERE uuid = $1
        LIMIT 1
      `,
      [requestedUuid],
    )

    if (codeResult.rowCount === 0) {
      response.status(404).json({
        ok: false,
        error: 'Access code uuid not found.',
      })
      return
    }

    await ensureProfileExistsForCodeRow(codeResult.rows[0])
    const profileUuid = codeResult.rows[0].uuid
    const existingProfile = await getProfileByUuid(profileUuid)
    const fallbackName = getGuestNameFromAccessCode(codeResult.rows[0].code)
    const profileName = requestedName || existingProfile?.name || fallbackName
    let objectKey = existingProfile?.objectKey || null
    let urlProfilePic = existingProfile?.urlProfilePic || null

    if (file) {
      if (!hasR2Config || !r2Client || !r2BucketName || !r2PublicBaseUrl) {
        response.status(500).json({
          ok: false,
          error:
            'R2 is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, and R2_PUBLIC_BASE_URL in .env.',
        })
        return
      }

      const extension = getSafeFileExtension(file.originalname, file.mimetype)
      objectKey = `wedding_profile_pics/${Date.now()}-${crypto.randomUUID()}.${extension}`

      await r2Client.send(
        new PutObjectCommand({
          Bucket: r2BucketName,
          Key: objectKey,
          Body: file.buffer,
          ContentType: file.mimetype || 'image/jpeg',
        }),
      )

      urlProfilePic = buildPublicImageUrl(objectKey)
    }

    const result = await pool.query(
      `
        INSERT INTO profiles (
          uuid,
          name,
          object_key,
          url_profile_pic
        )
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (uuid)
        DO UPDATE SET
          name = EXCLUDED.name,
          object_key = EXCLUDED.object_key,
          url_profile_pic = EXCLUDED.url_profile_pic
        RETURNING id, uuid, name, object_key, url_profile_pic, verified
      `,
      [profileUuid, profileName, objectKey, urlProfilePic],
    )

    response.status(200).json({
      ok: true,
      profile: await getProfileByUuid(result.rows[0].uuid),
    })
  } catch (error) {
    response.status(500).json({
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to upload profile picture and create profile.',
    })
  }
})

if (hasBuiltFrontend) {
  app.get(/^(?!\/api(?:\/|$)).*/, (_request, response) => {
    response.sendFile(path.join(distDir, 'index.html'))
  })
}

async function startServer() {
  await ensureDatabaseSchema()

  app.listen(port, () => {
    console.log(`Visitor API listening on http://127.0.0.1:${port}`)
  })
}

startServer().catch((error) => {
  console.error('Failed to start backend:', error)
  process.exit(1)
})
