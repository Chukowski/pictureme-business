-- Migration 010: Create Pachecodes user in Better Auth tables
-- Creates user in Better Auth "user" table and "account" table with password

-- Insert into Better Auth user table
INSERT INTO "user" (
    id,
    email,
    "emailVerified",
    name,
    "createdAt",
    "updatedAt",
    slug,
    role,
    tokens_remaining,
    is_active
) VALUES (
    '8', -- Match the ID from users table
    'jpacheco@akitapr.com',
    TRUE,
    'Pachecodes',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    'pachecodes',
    'business_masters',
    10000,
    TRUE
)
ON CONFLICT (email) DO UPDATE SET
    name = EXCLUDED.name,
    slug = EXCLUDED.slug,
    role = EXCLUDED.role,
    tokens_remaining = EXCLUDED.tokens_remaining,
    "updatedAt" = CURRENT_TIMESTAMP;

-- Insert into account table with password
-- Better Auth uses bcrypt for password hashing
INSERT INTO account (
    id,
    "userId",
    "accountId",
    "providerId",
    "accessToken",
    "refreshToken",
    "idToken",
    "expiresAt",
    password,
    "createdAt",
    "updatedAt"
) VALUES (
    gen_random_uuid()::text,
    '8', -- Match the user ID
    'jpacheco@akitapr.com',
    'credential',
    NULL,
    NULL,
    NULL,
    NULL,
    '$2b$12$P0pmFgzu1gXJGRbRIFW9jOPovfgsIspjlNHIz.27sQcL.IgGspZVu', -- Password: Mc4tnqjb.
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT ("userId", "providerId") DO UPDATE SET
    password = EXCLUDED.password,
    "updatedAt" = CURRENT_TIMESTAMP;

-- Verify the user was created
SELECT 
    u.id,
    u.email,
    u.name,
    u.slug,
    u.role,
    u.tokens_remaining,
    u.is_active,
    a."providerId",
    a."accountId"
FROM "user" u
LEFT JOIN account a ON u.id = a."userId"
WHERE u.email = 'jpacheco@akitapr.com';

