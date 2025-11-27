-- Migration 011: Add Stripe Connect support for revenue share
-- Adds stripe_connect_id to users for Masters plan revenue sharing

-- Add Stripe Connect ID column
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_connect_id VARCHAR(255);
CREATE INDEX IF NOT EXISTS idx_users_stripe_connect ON users(stripe_connect_id) WHERE stripe_connect_id IS NOT NULL;

-- Add revenue share settings to custom_contracts
ALTER TABLE custom_contracts ADD COLUMN IF NOT EXISTS revenue_share_percent DECIMAL(5, 2) DEFAULT 0;
ALTER TABLE custom_contracts ADD COLUMN IF NOT EXISTS revenue_share_enabled BOOLEAN DEFAULT FALSE;

-- Create table for tracking revenue share payments
CREATE TABLE IF NOT EXISTS revenue_share_payments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_id INTEGER REFERENCES events(id) ON DELETE SET NULL,
    gross_amount DECIMAL(10, 2) NOT NULL,
    platform_fee DECIMAL(10, 2) NOT NULL,
    user_share DECIMAL(10, 2) NOT NULL,
    stripe_transfer_id VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending', -- pending, transferred, failed
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    transferred_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_revenue_share_user ON revenue_share_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_revenue_share_status ON revenue_share_payments(status);

-- Insert default token packages if not exist
INSERT INTO token_packages (name, description, tokens, price_usd, is_active)
VALUES 
    ('Starter Pack', '100 tokens para comenzar', 100, 10.00, TRUE),
    ('Basic Pack', '500 tokens con 10% bonus', 500, 40.00, TRUE),
    ('Pro Pack', '1000 tokens - Más popular', 1000, 70.00, TRUE),
    ('Enterprise Pack', '5000 tokens para alto volumen', 5000, 300.00, TRUE)
ON CONFLICT DO NOTHING;

COMMENT ON COLUMN users.stripe_connect_id IS 'Stripe Connect account ID for revenue share (Masters plan only)';

