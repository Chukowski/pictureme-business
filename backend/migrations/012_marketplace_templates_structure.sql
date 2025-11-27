-- Migration 012: Complete Marketplace Templates Structure
-- Supports both Business and Individual template types

-- Drop and recreate marketplace_templates with full structure
DROP TABLE IF EXISTS user_library CASCADE;
DROP TABLE IF EXISTS marketplace_templates CASCADE;

-- Main templates table
CREATE TABLE marketplace_templates (
    id SERIAL PRIMARY KEY,
    creator_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Basic Info
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    tags JSONB DEFAULT '[]'::jsonb,
    
    -- Template Type: 'business' (event-style) or 'individual' (simple)
    template_type VARCHAR(50) NOT NULL DEFAULT 'individual',
    
    -- Preview/Thumbnail
    preview_url TEXT,
    preview_images JSONB DEFAULT '[]'::jsonb, -- Multiple preview images
    
    -- === INDIVIDUAL TEMPLATE FIELDS ===
    -- Simple structure: backgrounds, prompt, elements, model selection
    backgrounds JSONB DEFAULT '[]'::jsonb, -- Array of background image URLs
    element_images JSONB DEFAULT '[]'::jsonb, -- Element/prop images for mixing
    prompt TEXT,
    negative_prompt TEXT,
    
    -- Model Selection (Individual)
    image_model VARCHAR(100) DEFAULT 'seedream-v4',
    faceswap_enabled BOOLEAN DEFAULT FALSE,
    faceswap_model VARCHAR(100),
    video_enabled BOOLEAN DEFAULT FALSE,
    video_model VARCHAR(100),
    
    -- === BUSINESS TEMPLATE FIELDS ===
    -- Full event-style template with pipeline config
    -- Stored as JSON to match EventConfig.templates structure
    business_config JSONB, -- Full Template object from eventsApi.ts
    
    -- Pipeline Configuration (shared)
    pipeline_config JSONB DEFAULT '{}'::jsonb,
    
    -- === MARKETPLACE FIELDS ===
    price INTEGER DEFAULT 0, -- Tokens to purchase (0 = free)
    tokens_cost INTEGER DEFAULT 1, -- Tokens per generation
    is_public BOOLEAN DEFAULT TRUE,
    is_premium BOOLEAN DEFAULT FALSE,
    is_exportable BOOLEAN DEFAULT TRUE, -- Can be exported as JSON (false for paid)
    
    -- Stats
    downloads INTEGER DEFAULT 0,
    rating DECIMAL(3,2) DEFAULT 5.0,
    rating_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_marketplace_templates_creator ON marketplace_templates(creator_id);
CREATE INDEX idx_marketplace_templates_type ON marketplace_templates(template_type);
CREATE INDEX idx_marketplace_templates_category ON marketplace_templates(category);
CREATE INDEX idx_marketplace_templates_public ON marketplace_templates(is_public) WHERE is_public = TRUE;

-- User's template library (purchased/owned templates)
CREATE TABLE user_library (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    template_id INTEGER REFERENCES marketplace_templates(id) ON DELETE CASCADE,
    lora_model_id VARCHAR(255), -- For future LoRA support
    item_type VARCHAR(50) NOT NULL DEFAULT 'template', -- 'template', 'lora', 'asset'
    
    -- Usage tracking
    times_used INTEGER DEFAULT 0,
    last_used_at TIMESTAMP,
    
    -- Purchase info
    purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    tokens_spent INTEGER DEFAULT 0,
    
    UNIQUE(user_id, template_id)
);

CREATE INDEX idx_user_library_user ON user_library(user_id);
CREATE INDEX idx_user_library_type ON user_library(item_type);

-- Insert some default templates for testing
INSERT INTO marketplace_templates (
    creator_id, name, description, category, template_type, 
    preview_url, backgrounds, prompt, image_model,
    price, tokens_cost, is_public, tags
) VALUES 
-- Individual Templates (Simple)
(
    (SELECT id FROM users WHERE role = 'superadmin' LIMIT 1),
    'Neon Cyberpunk',
    'Futuristic neon-lit backgrounds with cyberpunk aesthetics. Perfect for tech events and modern parties.',
    'Fantasy',
    'individual',
    'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400',
    '["https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1200"]'::jsonb,
    'cyberpunk neon city background, futuristic, vibrant colors, high contrast, professional photo',
    'seedream-v4',
    0, 2, TRUE,
    '["neon", "cyberpunk", "futuristic", "tech"]'::jsonb
),
(
    (SELECT id FROM users WHERE role = 'superadmin' LIMIT 1),
    'Tropical Paradise',
    'Vibrant tropical beach and palm tree backgrounds for summer vibes.',
    'Nature',
    'individual',
    'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=400',
    '["https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=1200"]'::jsonb,
    'tropical beach paradise, palm trees, crystal clear water, sunny day, vacation vibes',
    'seedream-v4',
    0, 2, TRUE,
    '["tropical", "beach", "summer", "vacation"]'::jsonb
),
(
    (SELECT id FROM users WHERE role = 'superadmin' LIMIT 1),
    'Galaxy Dreams',
    'Stunning space and galaxy backgrounds for cosmic themes.',
    'Fantasy',
    'individual',
    'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=400',
    '["https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=1200"]'::jsonb,
    'cosmic galaxy background, stars, nebula, deep space, ethereal lighting',
    'seedream-v4',
    0, 2, TRUE,
    '["space", "galaxy", "cosmic", "stars"]'::jsonb
),
-- Business Templates (Event-style with full config)
(
    (SELECT id FROM users WHERE role = 'superadmin' LIMIT 1),
    'Corporate Summit Pro',
    'Professional corporate event template with branding options and lead capture.',
    'Corporate',
    'business',
    'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400',
    '["https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200"]'::jsonb,
    'professional corporate event, modern office, business atmosphere, clean background',
    'seedream-v4',
    75, 4, TRUE,
    '["corporate", "business", "professional", "event"]'::jsonb
),
(
    (SELECT id FROM users WHERE role = 'superadmin' LIMIT 1),
    'Elegant Wedding Suite',
    'Complete wedding template with romantic backgrounds and elegant overlays.',
    'Weddings',
    'business',
    'https://images.unsplash.com/photo-1519741497674-611481863552?w=400',
    '["https://images.unsplash.com/photo-1519741497674-611481863552?w=1200", "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=1200"]'::jsonb,
    'elegant wedding venue, romantic atmosphere, soft lighting, floral decorations',
    'seedream-v4',
    100, 3, TRUE,
    '["wedding", "romantic", "elegant", "celebration"]'::jsonb
);

-- Give the templates to Pachecodes user for testing
INSERT INTO user_library (user_id, template_id, item_type, tokens_spent)
SELECT 
    (SELECT id FROM users WHERE username = 'Pachecodes'),
    id,
    'template',
    0
FROM marketplace_templates
WHERE price = 0
ON CONFLICT DO NOTHING;

COMMENT ON TABLE marketplace_templates IS 'Marketplace templates - supports both Business (event-style) and Individual (simple) types';
COMMENT ON COLUMN marketplace_templates.template_type IS 'business = full event template config, individual = simple backgrounds/prompt';
COMMENT ON COLUMN marketplace_templates.business_config IS 'Full Template JSON for business templates (matches eventsApi.ts Template interface)';
COMMENT ON COLUMN marketplace_templates.is_exportable IS 'Whether template can be exported as JSON (false for paid templates)';

