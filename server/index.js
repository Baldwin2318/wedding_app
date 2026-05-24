import cors from 'cors'
import express from 'express'
import pg from 'pg'

const { Pool } = pg

const app = express()
const port = Number(process.env.PORT || 8788)
const databaseUrl = process.env.DATABASE_URL
const allowedOrigin = process.env.ALLOWED_ORIGIN || 'http://127.0.0.1:5173'

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

app.get('/api/health', async (_request, response) => {
  try {
    await pool.query('SELECT 1')
    response.status(200).json({ ok: true })
  } catch (error) {
    response.status(500).json({
      ok: false,
      error:
        error instanceof Error ? error.message : 'Database health check failed.',
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

app.listen(port, () => {
  console.log(`Visitor API listening on http://127.0.0.1:${port}`)
})
