# wedding_app

This app now supports uploading captured photos to Cloudflare R2 through a server-side upload endpoint.

It also supports tracking each app open into Neon Postgres by upserting one row per IP address.

## Flow

1. The camera captures a photo in the browser.
2. When the user taps `Done`, the app posts the image as `multipart/form-data` to `VITE_UPLOAD_API_URL`.
3. A Cloudflare Worker stores the file in R2.
4. The Worker returns a public image URL.
5. The feed renders the R2 image URL.

## Frontend setup

Create a local env file:

```bash
cp .env.example .env
```

Default local value:

```env
VITE_UPLOAD_API_URL=http://127.0.0.1:8787/api/photos
DATABASE_URL=postgresql://user:password@your-neon-host/dbname?sslmode=require
ALLOWED_ORIGIN=http://127.0.0.1:5173
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

## Cloudflare setup

1. Create an R2 bucket in Cloudflare.
2. Make the bucket public, or attach a custom public domain.
3. Copy [cloudflare/wrangler.toml.example](/Users/baldwinkielmalabanan/writable_projs_for_codex/wedding_app/wedding_app/cloudflare/wrangler.toml.example) to `cloudflare/wrangler.toml`.
4. Set `bucket_name` to your bucket.
5. Set `PUBLIC_BUCKET_BASE_URL` to the public bucket URL or custom domain.
6. Set `ALLOWED_ORIGIN` to your frontend origin.

Worker source: [cloudflare/worker.js](/Users/baldwinkielmalabanan/writable_projs_for_codex/wedding_app/wedding_app/cloudflare/worker.js)

## Run locally

From the `cloudflare` folder:

```bash
wrangler dev
```

Then run the Vite app:

```bash
npm run dev
```

## Deploy

From the `cloudflare` folder:

```bash
wrangler deploy
```

After deploy, point the frontend to the Worker:

```env
VITE_UPLOAD_API_URL=https://your-worker-name.your-subdomain.workers.dev/api/photos
```

## Important

Do not store R2 credentials in the Vite frontend. The browser should call the Worker only. The Worker accesses R2 through the `WEDDING_PHOTOS` binding.
