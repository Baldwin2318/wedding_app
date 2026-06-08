CREATE TABLE IF NOT EXISTS app_visitors (
  ip_address TEXT PRIMARY KEY,
  last_opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS photo_captures (
  id BIGSERIAL PRIMARY KEY,
  object_key TEXT NOT NULL UNIQUE,
  image_url TEXT NOT NULL,
  caption TEXT NOT NULL DEFAULT '',
  ip_address TEXT NOT NULL,
  visitor_identity TEXT NOT NULL,
  uploader_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  likes_count INTEGER
);

CREATE TABLE IF NOT EXISTS photo_capture_likes (
  photo_capture_id BIGINT NOT NULL REFERENCES photo_captures(id) ON DELETE CASCADE,
  ip_address TEXT NOT NULL,
  visitor_identity TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (photo_capture_id, visitor_identity)
);

CREATE TABLE IF NOT EXISTS profiles (
  id BIGSERIAL PRIMARY KEY,
  uuid TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  object_key TEXT UNIQUE,
  url_profile_pic TEXT
);