-- Migration: Enterprise Custom Pricing System
-- Date: 2025-11-25
-- Description: Adds custom pricing per user for enterprise/business accounts

-- ============================================================================
-- CUSTOM USER PRICING TABLE
-- ============================================================================
-- Allows setting custom prices per model for specific users (enterprise/business)
CREATE TABLE IF NOT EXISTS custom_user_pricing (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    model_id VARCHAR(100) NOT NULL, -- e.g., 'seedream-t2i', 'nano-banana', 'veo-3.1'
    model_type VARCHAR(50) NOT NULL, -- 'image', 'video', 'face-swap'
    token_cost INTEGER NOT NULL, -- Custom token cost for this user
    price_per_token DECIMAL(10, 4), -- Optional: Custom $ price per token (e.g., 0.20)
    notes TEXT, -- Admin notes about this pricing
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id), -- Admin who created this pricing
    
    -- Ensure unique pricing per user per model
    UNIQUE(user_id, model_id)
);

CREATE INDEX idx_custom_pricing_user_id ON custom_user_pricing(user_id);
CREATE INDEX idx_custom_pricing_model_id ON custom_user_pricing(model_id);
CREATE INDEX idx_custom_pricing_active ON custom_user_pricing(is_active);

-- ============================================================================
-- USER TOKEN PACKAGES (Custom packages for enterprise users)
-- ============================================================================
-- Allows creating custom token packages for specific users
CREATE TABLE IF NOT EXISTS custom_user_packages (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    tokens INTEGER NOT NULL,
    price_usd DECIMAL(10, 2) NOT NULL,
    price_per_token DECIMAL(10, 4) GENERATED ALWAYS AS (price_usd / tokens) STORED,
    stripe_price_id VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id), -- Admin who created this package
    
    -- Ensure unique package name per user
    UNIQUE(user_id, name)
);

CREATE INDEX idx_custom_packages_user_id ON custom_user_packages(user_id);

-- ============================================================================
-- ENTERPRISE USER SETTINGS
-- ============================================================================
-- Additional settings for enterprise/business users
CREATE TABLE IF NOT EXISTS enterprise_user_settings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    
    -- Pricing settings
    uses_custom_pricing BOOLEAN DEFAULT FALSE,
    default_price_per_token DECIMAL(10, 4) DEFAULT 0.10, -- Default $ per token
    billing_cycle VARCHAR(20) DEFAULT 'monthly', -- 'monthly', 'quarterly', 'annual'
    
    -- Credit limits
    credit_limit INTEGER DEFAULT 0, -- Max tokens they can use before payment
    current_credit_used INTEGER DEFAULT 0,
    
    -- Contract info
    contract_start_date DATE,
    contract_end_date DATE,
    contract_notes TEXT,
    
    -- Contact info
    billing_email VARCHAR(255),
    billing_contact_name VARCHAR(255),
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id)
);

CREATE INDEX idx_enterprise_settings_user_id ON enterprise_user_settings(user_id);

-- ============================================================================
-- AI MODEL REGISTRY (Comprehensive model list)
-- ============================================================================
-- Update existing ai_generation_costs with more models
INSERT INTO ai_generation_costs (model_name, cost_per_generation, description, is_active) VALUES
-- Image Models
('seedream-t2i', 5, 'Seedream v4 Text-to-Image - High quality image generation', TRUE),
('seedream-edit', 10, 'Seedream v4 Edit - Image editing and enhancement', TRUE),
('nano-banana', 8, 'Nano Banana (Google Imagen 3) - Fast image generation', TRUE),
('nano-banana-pro', 15, 'Nano Banana Pro - Premium Google Imagen', TRUE),
('flux-realism', 5, 'Flux Realism - Photorealistic images', TRUE),
-- Video Models
('kling-pro', 50, 'Kling Video v2.5 Pro - Professional video generation', TRUE),
('wan-v2', 40, 'Wan v2.2 Video - Text to video', TRUE),
('google-video', 60, 'Google Gemini Video - Beta video generation', TRUE),
('veo-3.1', 100, 'Veo 3.1 - Google premium video model', TRUE)
ON CONFLICT (model_name) DO UPDATE SET
    description = EXCLUDED.description,
    is_active = EXCLUDED.is_active;

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to get effective token cost for a user/model combination
CREATE OR REPLACE FUNCTION get_effective_token_cost(
    p_user_id INTEGER,
    p_model_id VARCHAR(100)
) RETURNS INTEGER AS $$
DECLARE
    v_custom_cost INTEGER;
    v_default_cost INTEGER;
BEGIN
    -- First check for custom pricing
    SELECT token_cost INTO v_custom_cost
    FROM custom_user_pricing
    WHERE user_id = p_user_id 
      AND model_id = p_model_id 
      AND is_active = TRUE;
    
    IF FOUND THEN
        RETURN v_custom_cost;
    END IF;
    
    -- Fall back to default pricing
    SELECT cost_per_generation INTO v_default_cost
    FROM ai_generation_costs
    WHERE model_name = p_model_id 
      AND is_active = TRUE;
    
    -- Return default cost or 5 if not found
    RETURN COALESCE(v_default_cost, 5);
END;
$$ LANGUAGE plpgsql;

-- Function to get all pricing for a user (custom + defaults)
CREATE OR REPLACE FUNCTION get_user_pricing(p_user_id INTEGER)
RETURNS TABLE (
    model_id VARCHAR(100),
    model_type VARCHAR(50),
    default_cost INTEGER,
    custom_cost INTEGER,
    effective_cost INTEGER,
    has_custom_pricing BOOLEAN,
    price_per_token DECIMAL(10, 4)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        agc.model_name as model_id,
        CASE 
            WHEN agc.model_name LIKE '%video%' OR agc.model_name IN ('kling-pro', 'wan-v2', 'google-video', 'veo-3.1') THEN 'video'
            ELSE 'image'
        END as model_type,
        agc.cost_per_generation as default_cost,
        cup.token_cost as custom_cost,
        COALESCE(cup.token_cost, agc.cost_per_generation) as effective_cost,
        (cup.id IS NOT NULL) as has_custom_pricing,
        cup.price_per_token
    FROM ai_generation_costs agc
    LEFT JOIN custom_user_pricing cup 
        ON agc.model_name = cup.model_id 
        AND cup.user_id = p_user_id 
        AND cup.is_active = TRUE
    WHERE agc.is_active = TRUE
    ORDER BY model_type, agc.model_name;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger for updated_at on custom_user_pricing
DROP TRIGGER IF EXISTS update_custom_pricing_updated_at ON custom_user_pricing;
CREATE TRIGGER update_custom_pricing_updated_at 
    BEFORE UPDATE ON custom_user_pricing
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for updated_at on custom_user_packages
DROP TRIGGER IF EXISTS update_custom_packages_updated_at ON custom_user_packages;
CREATE TRIGGER update_custom_packages_updated_at 
    BEFORE UPDATE ON custom_user_packages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for updated_at on enterprise_user_settings
DROP TRIGGER IF EXISTS update_enterprise_settings_updated_at ON enterprise_user_settings;
CREATE TRIGGER update_enterprise_settings_updated_at 
    BEFORE UPDATE ON enterprise_user_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- VIEWS
-- ============================================================================

-- View for enterprise users with their pricing summary
CREATE OR REPLACE VIEW enterprise_users_summary AS
SELECT 
    u.id as user_id,
    u.email,
    u.username,
    u.name,
    u.role,
    u.tokens_remaining,
    u.subscription_tier,
    eus.uses_custom_pricing,
    eus.default_price_per_token,
    eus.credit_limit,
    eus.current_credit_used,
    eus.billing_cycle,
    eus.contract_start_date,
    eus.contract_end_date,
    COUNT(DISTINCT cup.id) as custom_pricing_count,
    COUNT(DISTINCT cupack.id) as custom_packages_count
FROM users u
LEFT JOIN enterprise_user_settings eus ON u.id = eus.user_id
LEFT JOIN custom_user_pricing cup ON u.id = cup.user_id AND cup.is_active = TRUE
LEFT JOIN custom_user_packages cupack ON u.id = cupack.user_id AND cupack.is_active = TRUE
WHERE u.role IN ('business', 'enterprise', 'admin')
GROUP BY u.id, u.email, u.username, u.name, u.role, u.tokens_remaining, u.subscription_tier,
         eus.uses_custom_pricing, eus.default_price_per_token, eus.credit_limit, 
         eus.current_credit_used, eus.billing_cycle, eus.contract_start_date, eus.contract_end_date;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
COMMENT ON TABLE custom_user_pricing IS 'Custom per-model pricing for enterprise/business users';
COMMENT ON TABLE custom_user_packages IS 'Custom token packages for specific users';
COMMENT ON TABLE enterprise_user_settings IS 'Enterprise user billing and contract settings';
COMMENT ON FUNCTION get_effective_token_cost IS 'Returns the effective token cost for a user/model, checking custom pricing first';
COMMENT ON FUNCTION get_user_pricing IS 'Returns all model pricing for a user with custom overrides';

