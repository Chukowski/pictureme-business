-- Migration: Add Public Profile Fields
-- Date: 2025-11-25
-- Description: Adds fields for public profiles, social links, and publish settings

-- ============================================================================
-- ADD PROFILE FIELDS TO USERS TABLE
-- ============================================================================

-- Bio field
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='users' AND column_name='bio') THEN
        ALTER TABLE users ADD COLUMN bio TEXT;
    END IF;
END $$;

-- Cover image URL
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='users' AND column_name='cover_image_url') THEN
        ALTER TABLE users ADD COLUMN cover_image_url TEXT;
    END IF;
END $$;

-- Social links (JSON)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='users' AND column_name='social_links') THEN
        ALTER TABLE users ADD COLUMN social_links JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- Is profile public
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='users' AND column_name='is_public') THEN
        ALTER TABLE users ADD COLUMN is_public BOOLEAN DEFAULT TRUE;
    END IF;
END $$;

-- Publish to explore setting
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='users' AND column_name='publish_to_explore') THEN
        ALTER TABLE users ADD COLUMN publish_to_explore BOOLEAN DEFAULT TRUE;
    END IF;
END $$;

-- ============================================================================
-- USER CREATIONS TABLE (for published content)
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_creations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    thumbnail_url TEXT,
    type VARCHAR(20) NOT NULL, -- 'image', 'video'
    prompt TEXT,
    model VARCHAR(100),
    likes INTEGER DEFAULT 0,
    views INTEGER DEFAULT 0,
    is_published BOOLEAN DEFAULT FALSE,
    is_featured BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_creations_user_id ON user_creations(user_id);
CREATE INDEX IF NOT EXISTS idx_creations_published ON user_creations(is_published);
CREATE INDEX IF NOT EXISTS idx_creations_type ON user_creations(type);
CREATE INDEX IF NOT EXISTS idx_creations_created_at ON user_creations(created_at DESC);

-- ============================================================================
-- CREATION LIKES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS creation_likes (
    id SERIAL PRIMARY KEY,
    creation_id INTEGER NOT NULL REFERENCES user_creations(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(creation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_creation_likes_creation ON creation_likes(creation_id);
CREATE INDEX IF NOT EXISTS idx_creation_likes_user ON creation_likes(user_id);

-- ============================================================================
-- CREATION VIEWS TABLE (optional, for tracking unique views)
-- ============================================================================
CREATE TABLE IF NOT EXISTS creation_views (
    id SERIAL PRIMARY KEY,
    creation_id INTEGER NOT NULL REFERENCES user_creations(id) ON DELETE CASCADE,
    viewer_ip VARCHAR(45), -- IPv6 compatible
    viewer_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_creation_views_creation ON creation_views(creation_id);

-- ============================================================================
-- BOARDS TABLE (collections of creations)
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_boards (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    cover_url TEXT,
    is_public BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS board_items (
    id SERIAL PRIMARY KEY,
    board_id INTEGER NOT NULL REFERENCES user_boards(id) ON DELETE CASCADE,
    creation_id INTEGER NOT NULL REFERENCES user_creations(id) ON DELETE CASCADE,
    position INTEGER DEFAULT 0,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(board_id, creation_id)
);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update likes count on creation when like is added/removed
CREATE OR REPLACE FUNCTION update_creation_likes_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE user_creations SET likes = likes + 1 WHERE id = NEW.creation_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE user_creations SET likes = likes - 1 WHERE id = OLD.creation_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_likes_count ON creation_likes;
CREATE TRIGGER trigger_update_likes_count
    AFTER INSERT OR DELETE ON creation_likes
    FOR EACH ROW EXECUTE FUNCTION update_creation_likes_count();

-- ============================================================================
-- VIEWS
-- ============================================================================

-- View for public profile data
CREATE OR REPLACE VIEW public_profiles AS
SELECT 
    u.id,
    u.username,
    u.slug,
    u.full_name,
    u.avatar_url,
    u.cover_image_url,
    u.bio,
    u.social_links,
    u.is_public,
    u.created_at,
    COUNT(DISTINCT c.id) FILTER (WHERE c.is_published = TRUE) as posts_count,
    COALESCE(SUM(c.likes) FILTER (WHERE c.is_published = TRUE), 0) as total_likes,
    COALESCE(SUM(c.views) FILTER (WHERE c.is_published = TRUE), 0) as total_views
FROM users u
LEFT JOIN user_creations c ON u.id = c.user_id
WHERE u.is_public = TRUE AND u.is_active = TRUE
GROUP BY u.id;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
COMMENT ON TABLE user_creations IS 'User generated content (images, videos)';
COMMENT ON TABLE creation_likes IS 'Likes on user creations';
COMMENT ON TABLE user_boards IS 'User curated collections of creations';
COMMENT ON COLUMN users.bio IS 'User biography/description';
COMMENT ON COLUMN users.social_links IS 'JSON object with social media links';
COMMENT ON COLUMN users.publish_to_explore IS 'Auto-publish creations to explore page';

