-- Migration 013: Update user_library for CouchDB template IDs
-- Template IDs are now strings (CouchDB _id) instead of integers

-- Drop old table and recreate with string template_id
DROP TABLE IF EXISTS user_library CASCADE;

CREATE TABLE user_library (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    template_id VARCHAR(255) NOT NULL, -- CouchDB document _id
    lora_model_id VARCHAR(255), -- For future LoRA support
    item_type VARCHAR(50) NOT NULL DEFAULT 'template',
    
    -- Usage tracking
    times_used INTEGER DEFAULT 0,
    last_used_at TIMESTAMP,
    
    -- Purchase info
    purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    tokens_spent INTEGER DEFAULT 0,
    
    UNIQUE(user_id, template_id)
);

CREATE INDEX idx_user_library_user ON user_library(user_id);
CREATE INDEX idx_user_library_template ON user_library(template_id);
CREATE INDEX idx_user_library_type ON user_library(item_type);

-- Add free default templates to Pachecodes library
INSERT INTO user_library (user_id, template_id, item_type, tokens_spent)
SELECT 
    (SELECT id FROM users WHERE username = 'Pachecodes'),
    template_id,
    'template',
    0
FROM (VALUES 
    ('default_neon_cyberpunk'),
    ('default_tropical_paradise'),
    ('default_galaxy_dreams')
) AS defaults(template_id)
ON CONFLICT DO NOTHING;

COMMENT ON TABLE user_library IS 'User owned templates and assets - template_id references CouchDB documents';

