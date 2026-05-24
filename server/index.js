import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import cors from 'cors'
import express from 'express'
import multer from 'multer'
import pg from 'pg'

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
}

app.set('trust proxy', true)
app.use(
  cors({
    origin: allowedOrigin,
  }),
)
app.use(express.json())

function getRequestIpAddress(request) {
  const forwardedFor = request.headers['x-forwarded-for']

  if (typeof forwardedFor === 'string' && forwardedFor.length > 0) {
    return forwardedFor.split(',')[0].trim()
  }

  return request.ip || request.socket?.remoteAddress || 'unknown'
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

app.get('/api/photos', async (_request, response) => {
  try {
    const result = await pool.query(
      `
        SELECT id, object_key, image_url, caption, ip_address, created_at
        FROM photo_captures
        ORDER BY created_at DESC
      `,
    )

    response.status(200).json({
      ok: true,
      photos: result.rows.map((row) => ({
        id: String(row.id),
        key: row.object_key,
        imageUrl: buildPublicImageUrl(row.object_key, row.image_url),
        caption: row.caption,
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
        RETURNING id, object_key, image_url, caption, ip_address, created_at
      `,
      [objectKey, imageUrl, caption, ipAddress],
    )

    response.status(200).json({
      ok: true,
      id: result.rows[0].id,
      key: result.rows[0].object_key,
      imageUrl: result.rows[0].image_url,
      caption: result.rows[0].caption,
      ipAddress: result.rows[0].ip_address,
      createdAt: result.rows[0].created_at,
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
