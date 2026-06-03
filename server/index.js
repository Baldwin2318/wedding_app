import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
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
    CREATE TABLE IF NOT EXISTS photo_capture_likes (
      photo_capture_id BIGINT NOT NULL REFERENCES photo_captures(id) ON DELETE CASCADE,
      ip_address TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (photo_capture_id, ip_address)
    );
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
  const ipAddress = getRequestIpAddress(request)

  try {
    const result = await pool.query(
      `
        SELECT
          photo_captures.id,
          photo_captures.object_key,
          photo_captures.image_url,
          photo_captures.caption,
          photo_captures.ip_address,
          photo_captures.created_at,
          photo_captures.likes_count,
          photo_capture_likes.photo_capture_id IS NOT NULL AS liked_by_current_visitor
        FROM photo_captures
        LEFT JOIN photo_capture_likes
          ON photo_capture_likes.photo_capture_id = photo_captures.id
          AND photo_capture_likes.ip_address = $1
        ORDER BY photo_captures.created_at DESC
      `,
      [ipAddress],
    )

    response.status(200).json({
      ok: true,
      photos: result.rows.map((row) => ({
        id: String(row.id),
        key: row.object_key,
        imageUrl: buildPublicImageUrl(row.object_key, row.image_url),
        caption: row.caption,
        likesCount: row.likes_count,
        likedByCurrentVisitor: row.liked_by_current_visitor,
        ipAddress: row.ip_address,
        createdAt: row.created_at,
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
          created_at
        )
        VALUES ($1, $2, $3, $4, NOW())
        RETURNING id, object_key, image_url, caption, ip_address, created_at, likes_count
      `,
      [objectKey, imageUrl, caption, ipAddress],
    )

    response.status(200).json({
      ok: true,
      id: result.rows[0].id,
      key: result.rows[0].object_key,
      imageUrl: result.rows[0].image_url,
      caption: result.rows[0].caption,
      likesCount: result.rows[0].likes_count,
      ipAddress: result.rows[0].ip_address,
      createdAt: result.rows[0].created_at,
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
          INSERT INTO photo_capture_likes (photo_capture_id, ip_address)
          VALUES ($1, $2)
          ON CONFLICT (photo_capture_id, ip_address) DO NOTHING
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
      [id, ipAddress],
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
  const ipAddress = getRequestIpAddress(request)
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
            AND ip_address = $2
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
      [id, ipAddress],
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
