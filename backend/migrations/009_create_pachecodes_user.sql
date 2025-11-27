-- Migration 009: Create Pachecodes user with Masters plan
-- Creates user "Pachecodes" with Masters plan and initial tokens

-- Insert user
INSERT INTO users (
    username,
    email,
    password_hash,
    full_name,
    slug,
    role,
    plan_id,
    tokens_remaining,
    plan_started_at,
    plan_renewal_date,
    is_active,
    created_at,
    updated_at
) VALUES (
    'Pachecodes',
    'jpacheco@akitapr.com',
    '$2b$12$P0pmFgzu1gXJGRbRIFW9jOPovfgsIspjlNHIz.27sQcL.IgGspZVu',
    'Pachecodes',
    'pachecodes',
    'business_masters',
    'masters',
    10000, -- Masters plan includes 10,000 tokens/month
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP + INTERVAL '1 month',
    TRUE,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT (username) DO UPDATE SET
    email = EXCLUDED.email,
    password_hash = EXCLUDED.password_hash,
    full_name = EXCLUDED.full_name,
    slug = EXCLUDED.slug,
    role = EXCLUDED.role,
    plan_id = EXCLUDED.plan_id,
    tokens_remaining = EXCLUDED.tokens_remaining,
    plan_started_at = EXCLUDED.plan_started_at,
    plan_renewal_date = EXCLUDED.plan_renewal_date,
    updated_at = CURRENT_TIMESTAMP;

-- Verify the user was created
SELECT 
    id,
    username,
    email,
    full_name,
    slug,
    role,
    plan_id,
    tokens_remaining,
    plan_started_at,
    plan_renewal_date,
    is_active,
    created_at
FROM users 
WHERE username = 'Pachecodes';

