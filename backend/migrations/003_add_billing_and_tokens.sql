-- Migration: Add Billing and Token System
-- Date: 2025-11-24
-- Description: Adds tables for Stripe integration, token packages, and usage tracking

-- ============================================================================
-- TOKEN PACKAGES
-- ============================================================================
CREATE TABLE IF NOT EXISTS token_packages (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    tokens INTEGER NOT NULL,
    price_usd DECIMAL(10, 2) NOT NULL,
    stripe_price_id VARCHAR(255) UNIQUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default packages
INSERT INTO token_packages (name, description, tokens, price_usd, is_active) VALUES
('Starter Pack', '100 AI generation tokens', 100, 9.99, TRUE),
('Pro Pack', '500 AI generation tokens - Best Value!', 500, 39.99, TRUE),
('Business Pack', '1500 AI generation tokens', 1500, 99.99, TRUE),
('Enterprise Pack', '5000 AI generation tokens', 5000, 299.99, TRUE)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- TOKEN TRANSACTIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS token_transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL, -- positive for credits, negative for debits
    transaction_type VARCHAR(50) NOT NULL, -- 'purchase', 'generation', 'refund', 'bonus'
    description TEXT,
    balance_after INTEGER NOT NULL,
    metadata JSONB, -- store additional info like event_id, photo_id, etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_token_transactions_user_id ON token_transactions(user_id);
CREATE INDEX idx_token_transactions_created_at ON token_transactions(created_at);

-- ============================================================================
-- STRIPE CUSTOMERS
-- ============================================================================
CREATE TABLE IF NOT EXISTS stripe_customers (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    stripe_customer_id VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_stripe_customers_user_id ON stripe_customers(user_id);
CREATE INDEX idx_stripe_customers_stripe_id ON stripe_customers(stripe_customer_id);

-- ============================================================================
-- STRIPE PAYMENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS stripe_payments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stripe_payment_intent_id VARCHAR(255) NOT NULL UNIQUE,
    stripe_customer_id VARCHAR(255) NOT NULL,
    amount_usd DECIMAL(10, 2) NOT NULL,
    tokens_purchased INTEGER NOT NULL,
    package_id INTEGER REFERENCES token_packages(id),
    status VARCHAR(50) NOT NULL, -- 'pending', 'succeeded', 'failed', 'refunded'
    payment_method VARCHAR(50), -- 'card', 'paypal', etc.
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_stripe_payments_user_id ON stripe_payments(user_id);
CREATE INDEX idx_stripe_payments_intent_id ON stripe_payments(stripe_payment_intent_id);
CREATE INDEX idx_stripe_payments_status ON stripe_payments(status);

-- ============================================================================
-- SUBSCRIPTIONS (for future use)
-- ============================================================================
CREATE TABLE IF NOT EXISTS subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stripe_subscription_id VARCHAR(255) NOT NULL UNIQUE,
    stripe_price_id VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL, -- 'active', 'canceled', 'past_due', 'trialing'
    current_period_start TIMESTAMP NOT NULL,
    current_period_end TIMESTAMP NOT NULL,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    tokens_per_month INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_id ON subscriptions(stripe_subscription_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

-- ============================================================================
-- AI GENERATION COSTS (for tracking and analytics)
-- ============================================================================
CREATE TABLE IF NOT EXISTS ai_generation_costs (
    id SERIAL PRIMARY KEY,
    model_name VARCHAR(100) NOT NULL,
    cost_per_generation INTEGER NOT NULL, -- tokens required
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default costs
INSERT INTO ai_generation_costs (model_name, cost_per_generation, description, is_active) VALUES
('fal-ai/flux/dev', 5, 'Flux Dev - High quality image generation', TRUE),
('fal-ai/bytedance/seedream/v4/edit', 10, 'SeedDream v4 - Premium cinematic editing', TRUE),
('fal-ai/gemini-25-flash-image/edit', 3, 'Gemini Flash - Fast lightweight editing', TRUE),
('fal-ai/kling/v1/standard/image-to-video', 50, 'Kling - Image to video generation', TRUE),
('fal-ai/wan/v2.2-a14b/text-to-video', 75, 'Wan - Text to video generation', TRUE)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- UPDATE users TABLE
-- ============================================================================
-- Add tokens_remaining if it doesn't exist (it might already exist from Better Auth)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='users' AND column_name='tokens_remaining') THEN
        ALTER TABLE users ADD COLUMN tokens_remaining INTEGER DEFAULT 100;
    END IF;
END $$;

-- Add subscription tier
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='users' AND column_name='subscription_tier') THEN
        ALTER TABLE users ADD COLUMN subscription_tier VARCHAR(50) DEFAULT 'free';
    END IF;
END $$;

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to deduct tokens and record transaction
CREATE OR REPLACE FUNCTION deduct_tokens(
    p_user_id INTEGER,
    p_amount INTEGER,
    p_description TEXT,
    p_metadata JSONB DEFAULT '{}'::JSONB
) RETURNS BOOLEAN AS $$
DECLARE
    v_current_balance INTEGER;
    v_new_balance INTEGER;
BEGIN
    -- Get current balance with row lock
    SELECT tokens_remaining INTO v_current_balance
    FROM users
    WHERE id = p_user_id
    FOR UPDATE;
    
    -- Check if user exists
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found: %', p_user_id;
    END IF;
    
    -- Check if sufficient balance
    IF v_current_balance < p_amount THEN
        RAISE EXCEPTION 'Insufficient tokens. Required: %, Available: %', p_amount, v_current_balance;
    END IF;
    
    -- Calculate new balance
    v_new_balance := v_current_balance - p_amount;
    
    -- Update user balance
    UPDATE users
    SET tokens_remaining = v_new_balance,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_user_id;
    
    -- Record transaction
    INSERT INTO token_transactions (
        user_id,
        amount,
        transaction_type,
        description,
        balance_after,
        metadata
    ) VALUES (
        p_user_id,
        -p_amount,
        'generation',
        p_description,
        v_new_balance,
        p_metadata
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to add tokens (purchase, bonus, refund)
CREATE OR REPLACE FUNCTION add_tokens(
    p_user_id INTEGER,
    p_amount INTEGER,
    p_transaction_type VARCHAR(50),
    p_description TEXT,
    p_metadata JSONB DEFAULT '{}'::JSONB
) RETURNS BOOLEAN AS $$
DECLARE
    v_current_balance INTEGER;
    v_new_balance INTEGER;
BEGIN
    -- Get current balance with row lock
    SELECT tokens_remaining INTO v_current_balance
    FROM users
    WHERE id = p_user_id
    FOR UPDATE;
    
    -- Check if user exists
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found: %', p_user_id;
    END IF;
    
    -- Calculate new balance
    v_new_balance := v_current_balance + p_amount;
    
    -- Update user balance
    UPDATE users
    SET tokens_remaining = v_new_balance,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_user_id;
    
    -- Record transaction
    INSERT INTO token_transactions (
        user_id,
        amount,
        transaction_type,
        description,
        balance_after,
        metadata
    ) VALUES (
        p_user_id,
        p_amount,
        p_transaction_type,
        p_description,
        v_new_balance,
        p_metadata
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VIEWS
-- ============================================================================

-- View for user billing summary
CREATE OR REPLACE VIEW user_billing_summary AS
SELECT 
    u.id AS user_id,
    u.email,
    u.username,
    u.tokens_remaining,
    u.subscription_tier,
    COUNT(DISTINCT sp.id) AS total_purchases,
    COALESCE(SUM(sp.amount_usd), 0) AS total_spent,
    COALESCE(SUM(sp.tokens_purchased), 0) AS total_tokens_purchased,
    COUNT(DISTINCT tt.id) FILTER (WHERE tt.transaction_type = 'generation') AS total_generations,
    COALESCE(SUM(ABS(tt.amount)) FILTER (WHERE tt.transaction_type = 'generation'), 0) AS total_tokens_used
FROM users u
LEFT JOIN stripe_payments sp ON u.id = sp.user_id AND sp.status = 'succeeded'
LEFT JOIN token_transactions tt ON u.id = tt.user_id
GROUP BY u.id, u.email, u.username, u.tokens_remaining, u.subscription_tier;

-- View for recent transactions
CREATE OR REPLACE VIEW recent_token_transactions AS
SELECT 
    tt.id,
    tt.user_id,
    u.email,
    u.username,
    tt.amount,
    tt.transaction_type,
    tt.description,
    tt.balance_after,
    tt.metadata,
    tt.created_at
FROM token_transactions tt
JOIN users u ON tt.user_id = u.id
ORDER BY tt.created_at DESC
LIMIT 100;

-- ============================================================================
-- GRANTS (if needed)
-- ============================================================================
-- GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO your_app_user;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO your_app_user;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
COMMENT ON TABLE token_packages IS 'Available token packages for purchase';
COMMENT ON TABLE token_transactions IS 'History of all token additions and deductions';
COMMENT ON TABLE stripe_customers IS 'Stripe customer IDs linked to users';
COMMENT ON TABLE stripe_payments IS 'Payment history via Stripe';
COMMENT ON TABLE subscriptions IS 'Active and past subscriptions';
COMMENT ON TABLE ai_generation_costs IS 'Token costs for different AI models';

