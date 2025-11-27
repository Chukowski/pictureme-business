-- Migration: Business Plans and Custom Contracts
-- Date: 2025-11-25
-- Description: Adds business plans configuration and custom contracts for revenue share deals

BEGIN;

-- ============================================================================
-- 1. BUSINESS PLANS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS business_plans (
    id SERIAL PRIMARY KEY,
    slug VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    monthly_price DECIMAL(10, 2) NOT NULL,
    included_tokens INTEGER NOT NULL,
    max_concurrent_events INTEGER NOT NULL,
    features JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    is_custom BOOLEAN DEFAULT FALSE, -- For Masters plan
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default business plans
INSERT INTO business_plans (slug, name, monthly_price, included_tokens, max_concurrent_events, features, is_custom)
VALUES 
    ('event_starter', 'Event Starter', 400.00, 1000, 1, 
     '["1,000 tokens/month", "1 active event", "Basic analytics", "BYOH (Bring Your Own Hardware)", "Email support"]'::jsonb, 
     FALSE),
    ('event_pro', 'Event Pro', 1500.00, 5000, 2, 
     '["5,000 tokens/month", "Up to 2 active events", "Advanced analytics", "BYOH (Bring Your Own Hardware)", "Lead capture & branded feeds", "Priority support"]'::jsonb, 
     FALSE),
    ('masters', 'Masters', 3000.00, 10000, 3, 
     '["10,000 tokens/month", "Up to 3 active events", "Premium templates & LoRA models", "Revenue-share & hardware options", "Print module", "Dedicated account manager"]'::jsonb, 
     TRUE)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    monthly_price = EXCLUDED.monthly_price,
    included_tokens = EXCLUDED.included_tokens,
    max_concurrent_events = EXCLUDED.max_concurrent_events,
    features = EXCLUDED.features,
    is_custom = EXCLUDED.is_custom,
    updated_at = CURRENT_TIMESTAMP;

-- ============================================================================
-- 2. CUSTOM CONTRACTS TABLE (for revenue share deals)
-- ============================================================================
CREATE TABLE IF NOT EXISTS custom_contracts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Token allocation
    base_tokens_per_month INTEGER DEFAULT 0, -- Override plan tokens
    extra_tokens_allocated INTEGER DEFAULT 0, -- Additional tokens on top of plan
    
    -- Revenue share
    revenue_share_percent DECIMAL(5, 2) DEFAULT 0, -- e.g., 15.00 for 15%
    
    -- Pricing override
    custom_monthly_price DECIMAL(10, 2), -- NULL means use plan price
    
    -- Hardware/services included
    includes_hardware BOOLEAN DEFAULT FALSE,
    includes_personnel BOOLEAN DEFAULT FALSE,
    hardware_notes TEXT,
    
    -- Contract period
    contract_start_date DATE,
    contract_end_date DATE,
    
    -- Notes and status
    notes TEXT, -- e.g., "Mall X – diciembre a febrero"
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Admin tracking
    admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_custom_contracts_user_id ON custom_contracts(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_contracts_active ON custom_contracts(is_active);
CREATE INDEX IF NOT EXISTS idx_custom_contracts_dates ON custom_contracts(contract_start_date, contract_end_date);

-- ============================================================================
-- 3. USER SUBSCRIPTION UPDATES
-- ============================================================================
-- Add plan reference to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_id VARCHAR(50) DEFAULT 'event_starter';
ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_started_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_renewal_date TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS monthly_token_reset_date TIMESTAMP;

-- ============================================================================
-- 4. TOKEN TRANSACTIONS UPDATES
-- ============================================================================
-- Ensure token_transactions has event_id
ALTER TABLE token_transactions ADD COLUMN IF NOT EXISTS event_id INTEGER REFERENCES events(id) ON DELETE SET NULL;

-- ============================================================================
-- 5. FUNCTION: Get user's effective token limit
-- ============================================================================
CREATE OR REPLACE FUNCTION get_user_token_limit(p_user_id INTEGER)
RETURNS INTEGER AS $$
DECLARE
    v_plan_tokens INTEGER;
    v_contract_base INTEGER;
    v_contract_extra INTEGER;
    v_total INTEGER;
BEGIN
    -- Get plan tokens
    SELECT bp.included_tokens INTO v_plan_tokens
    FROM users u
    JOIN business_plans bp ON u.plan_id = bp.slug
    WHERE u.id = p_user_id;
    
    v_plan_tokens := COALESCE(v_plan_tokens, 0);
    
    -- Get active contract overrides
    SELECT 
        COALESCE(SUM(CASE WHEN base_tokens_per_month > 0 THEN base_tokens_per_month ELSE 0 END), 0),
        COALESCE(SUM(extra_tokens_allocated), 0)
    INTO v_contract_base, v_contract_extra
    FROM custom_contracts
    WHERE user_id = p_user_id 
      AND is_active = TRUE
      AND (contract_start_date IS NULL OR contract_start_date <= CURRENT_DATE)
      AND (contract_end_date IS NULL OR contract_end_date >= CURRENT_DATE);
    
    -- If contract has base override, use it; otherwise use plan + extras
    IF v_contract_base > 0 THEN
        v_total := v_contract_base + v_contract_extra;
    ELSE
        v_total := v_plan_tokens + v_contract_extra;
    END IF;
    
    RETURN v_total;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 6. FUNCTION: Get user's active events count
-- ============================================================================
CREATE OR REPLACE FUNCTION get_active_events_count(p_user_id INTEGER)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)
        FROM events
        WHERE user_id = p_user_id AND status = 'active'
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 7. FUNCTION: Check if user can activate event
-- ============================================================================
CREATE OR REPLACE FUNCTION can_activate_event(p_user_id INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
    v_max_events INTEGER;
    v_active_count INTEGER;
BEGIN
    -- Get max events from plan
    SELECT bp.max_concurrent_events INTO v_max_events
    FROM users u
    JOIN business_plans bp ON u.plan_id = bp.slug
    WHERE u.id = p_user_id;
    
    v_max_events := COALESCE(v_max_events, 1);
    
    -- Get current active count
    v_active_count := get_active_events_count(p_user_id);
    
    RETURN v_active_count < v_max_events;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 8. UPDATE EXISTING USERS WITH DEFAULT PLAN
-- ============================================================================
UPDATE users 
SET plan_id = 'event_starter' 
WHERE plan_id IS NULL AND role LIKE 'business%';

UPDATE users 
SET plan_id = NULL 
WHERE role = 'individual' OR role = 'superadmin';

COMMIT;

