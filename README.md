# wedding_app

This app now supports uploading captured photos to Cloudflare R2 through a server-side upload endpoint.

It also supports tracking each app open into Neon Postgres by upserting one row per IP address.

## Flow

1. The camera captures a photo in the browser.
2. When the user taps `Done`, the app posts the image as `multipart/form-data` to `VITE_UPLOAD_API_URL`.
3. The Node backend uploads the file to Cloudflare R2.
4. The backend gets the public image URL.
5. The backend saves the URL, object key, caption, IP address, and timestamp in Neon Postgres.
6. The feed renders the R2 image URL.

## Frontend setup

Create a local env file:

```bash
cp .env.example .env
```

Default local value:

```env
VITE_UPLOAD_API_URL=/api/photos
DATABASE_URL=postgresql://user:password@your-neon-host/dbname?sslmode=require
ALLOWED_ORIGIN=http://127.0.0.1:5173
R2_ACCOUNT_ID=your-cloudflare-account-id
R2_ACCESS_KEY_ID=your-r2-access-key-id
R2_SECRET_ACCESS_KEY=your-r2-secret-access-key
R2_BUCKET_NAME=your-r2-bucket-name
R2_PUBLIC_BASE_URL=https://pub-your-public-bucket-domain.r2.dev
```

## Neon visitor tracking

Create the table in Neon with [server/schema.sql](/Users/baldwinkielmalabanan/writable_projs_for_codex/wedding_app/wedding_app/server/schema.sql:1).

Behavior:

1. The frontend calls `POST /api/visitors` once when the app loads.
2. The backend reads the device IP from the incoming request.
3. Neon stores one row per `ip_address`.
4. If the same IP opens the app again, `last_opened_at` is overwritten with the new timestamp.

Backend entrypoint: [server/index.js](/Users/baldwinkielmalabanan/writable_projs_for_codex/wedding_app/wedding_app/server/index.js:1)

Run the backend in a second terminal:

```bash
npm run dev:server
```

Then run the frontend:

```bash
npm run dev
```

## Photo capture storage flow

When the user taps `Done`, the app now follows this flow:

1. Upload image to Cloudflare R2.
2. Build the public image URL.
3. Insert a row into Neon `photo_captures`.
4. Return the saved metadata to the frontend.

Photo schema is also defined in [server/schema.sql](/Users/baldwinkielmalabanan/writable_projs_for_codex/wedding_app/wedding_app/server/schema.sql:1).

## Cloudflare R2 setup

1. Create an R2 bucket in Cloudflare.
2. Make the bucket public, or attach a custom public domain.
3. Create an R2 API token with object read/write permissions.
4. Copy its access key ID and secret into `.env`.
5. Set `R2_BUCKET_NAME`.
6. Set `R2_PUBLIC_BASE_URL` to the bucket public URL or custom domain.

## Important

Do not store R2 credentials in the Vite frontend. The browser posts to your backend only. The backend talks to R2 and Neon.
