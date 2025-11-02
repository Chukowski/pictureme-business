-- Migration 001: Multiuser Schema
-- Creates users, events tables and migrates photos to processed_photos

-- =====================
-- 1. USERS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  slug VARCHAR(50) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_users_slug ON users(slug);
CREATE INDEX idx_users_email ON users(email);

-- =====================
-- 2. EVENTS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slug VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  theme JSONB DEFAULT '{}'::jsonb,
  templates JSONB DEFAULT '[]'::jsonb,
  branding JSONB DEFAULT '{}'::jsonb,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, slug)
);

CREATE INDEX idx_events_user_id ON events(user_id);
CREATE INDEX idx_events_slug ON events(slug);
CREATE INDEX idx_events_active ON events(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_events_dates ON events(start_date, end_date);

-- =====================
-- 3. MIGRATE EXISTING PHOTOS TABLE
-- =====================

-- Create new processed_photos table with event association
CREATE TABLE IF NOT EXISTS processed_photos (
  id VARCHAR(255) PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
  original_image_url TEXT NOT NULL,
  processed_image_url TEXT NOT NULL,
  background_id VARCHAR(255),
  background_name VARCHAR(255),
  share_code VARCHAR(6) UNIQUE NOT NULL,
  created_at BIGINT NOT NULL,
  prompt TEXT,
  meta JSONB DEFAULT '{}'::jsonb,
  is_approved BOOLEAN DEFAULT TRUE,
  is_visible BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_processed_photos_event_id ON processed_photos(event_id);
CREATE INDEX idx_processed_photos_user_id ON processed_photos(user_id);
CREATE INDEX idx_processed_photos_share_code ON processed_photos(share_code);
CREATE INDEX idx_processed_photos_created_at ON processed_photos(created_at DESC);
CREATE INDEX idx_processed_photos_visible ON processed_photos(is_visible) WHERE is_visible = TRUE;

-- Migrate existing photos data (if photos table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'photos') THEN
    -- Create a default user for existing photos
    INSERT INTO users (username, email, password_hash, full_name, slug, is_active)
    VALUES ('legacy', 'legacy@photobooth.local', 'legacy_no_login', 'Legacy User', 'legacy', FALSE)
    ON CONFLICT (username) DO NOTHING;
    
    -- Create a default event for existing photos
    INSERT INTO events (
      user_id, 
      slug, 
      title, 
      description, 
      is_active,
      theme,
      branding
    )
    SELECT 
      (SELECT id FROM users WHERE username = 'legacy'),
      'akita-legacy',
      'Akitá (Legacy)',
      'Photos from before multiuser implementation',
      FALSE,
      '{"brandName": "Akitá", "primaryColor": "#0A3D62", "secondaryColor": "#F39C12"}'::jsonb,
      '{"headerBackgroundColor": "#FFFFFF", "footerBackgroundColor": "#000000", "logoPath": "/backgrounds/logo-akita.png"}'::jsonb
    ON CONFLICT (user_id, slug) DO NOTHING;
    
    -- Copy existing photos to processed_photos
    INSERT INTO processed_photos (
      id,
      user_id,
      event_id,
      original_image_url,
      processed_image_url,
      background_id,
      background_name,
      share_code,
      created_at,
      prompt,
      is_approved,
      is_visible
    )
    SELECT 
      p.id,
      (SELECT id FROM users WHERE username = 'legacy'),
      (SELECT id FROM events WHERE slug = 'akita-legacy'),
      p.original_image_url,
      p.processed_image_url,
      p.background_id,
      p.background_name,
      p.share_code,
      p.created_at,
      p.prompt,
      TRUE,
      FALSE  -- Hide legacy photos from feed by default
    FROM photos p
    ON CONFLICT (id) DO NOTHING;
    
    -- Optionally: drop old photos table (commented out for safety)
    -- DROP TABLE photos;
    
    RAISE NOTICE 'Migrated % photos to processed_photos', (SELECT COUNT(*) FROM photos);
  END IF;
END $$;

-- =====================
-- 4. SESSION TOKENS (optional, for persistent auth)
-- =====================
CREATE TABLE IF NOT EXISTS user_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sessions_token ON user_sessions(token);
CREATE INDEX idx_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_sessions_expires ON user_sessions(expires_at);

-- =====================
-- 5. HELPER FUNCTIONS
-- =====================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================
-- 6. DEFAULT SEED DATA (for testing)
-- =====================

-- Create demo user
INSERT INTO users (username, email, password_hash, full_name, slug)
VALUES (
  'demo',
  'demo@photobooth.app',
  -- Password: 'demo123' (in production, use proper bcrypt)
  '$2b$10$YourHashedPasswordHere',
  'Demo User',
  'demo'
) ON CONFLICT (username) DO NOTHING;

-- Create demo event
INSERT INTO events (
  user_id,
  slug,
  title,
  description,
  is_active,
  theme,
  templates,
  branding,
  settings
)
SELECT
  (SELECT id FROM users WHERE username = 'demo'),
  'akita-innovate-2025',
  'Akitá Innovation Day 2025',
  'AI Photo Booth showcase powered by Akitá',
  TRUE,
  '{
    "brandName": "Akitá",
    "primaryColor": "#0A3D62",
    "secondaryColor": "#F39C12",
    "tagline": "Experiencias fotográficas impulsadas por AI."
  }'::jsonb,
  '[
    {
      "id": "glares",
      "name": "Particle Field",
      "description": "Tech Innovation",
      "images": ["/backgrounds/glares.jpg", "/backgrounds/chevron_orange.png"],
      "prompt": "Take the person from the first image and place them into the second image background with the glowing golden particles and dark atmosphere...",
      "active": true,
      "includeHeader": true,
      "campaignText": null
    }
  ]'::jsonb,
  '{
    "logoPath": "/backgrounds/logo-akita.png",
    "footerPath": "/backgrounds/Footer_DoLess_Transparent.png",
    "headerBackgroundColor": "#FFFFFF",
    "footerBackgroundColor": "#000000",
    "taglineText": "Powered by Akitá — experiencias visuales para tus eventos."
  }'::jsonb,
  '{
    "aiModel": "fal-ai/bytedance/seedream/v4/edit",
    "imageSize": {"width": 1080, "height": 1920},
    "feedEnabled": true,
    "moderationEnabled": false,
    "maxPhotosPerSession": 3
  }'::jsonb
ON CONFLICT (user_id, slug) DO NOTHING;

COMMIT;
