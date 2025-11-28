-- Migration 014: Organizations, Members, and Albums
-- Adds support for Business Organizations and Multi-Station Album Tracking

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Organizations table
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    owner_user_id INTEGER NOT NULL REFERENCES users(id),
    plan VARCHAR(50) NOT NULL DEFAULT 'business_starter',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Organization Members table
CREATE TABLE IF NOT EXISTS organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL CHECK (role IN ('owner', 'admin', 'staff')),
    status VARCHAR(50) NOT NULL DEFAULT 'invited' CHECK (status IN ('active', 'invited', 'removed')),
    invite_token VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(organization_id, user_id)
);

-- Add organization_id to events
ALTER TABLE events ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
CREATE INDEX IF NOT EXISTS idx_events_org ON events(organization_id);

-- Albums table
CREATE TABLE IF NOT EXISTS albums (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id INTEGER NOT NULL REFERENCES events(id),
    organization_id UUID REFERENCES organizations(id),
    code VARCHAR(50) NOT NULL UNIQUE,
    status VARCHAR(50) NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'paid', 'archived')),
    payment_status VARCHAR(50) NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'processing', 'paid')),
    owner_name VARCHAR(255),
    owner_email VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Album Photos table
CREATE TABLE IF NOT EXISTS album_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    album_id UUID NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
    photo_id VARCHAR(255) NOT NULL, -- Can be CouchDB ID or URL
    station_type VARCHAR(50) NOT NULL CHECK (station_type IN ('registration', 'booth', 'playground', 'viewer')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_organizations_owner ON organizations(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_user ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_albums_event ON albums(event_id);
CREATE INDEX IF NOT EXISTS idx_albums_code ON albums(code);

-- Migrate existing Business Users to Organization Owners
DO $$
DECLARE
    user_rec RECORD;
    org_id UUID;
BEGIN
    FOR user_rec IN 
        SELECT id, username, slug, role, plan_id 
        FROM users 
        WHERE role IN ('business_starter', 'business_eventpro', 'business_masters')
    LOOP
        -- Check if organization already exists for this user
        IF NOT EXISTS (SELECT 1 FROM organizations WHERE owner_user_id = user_rec.id) THEN
            -- Create Organization
            INSERT INTO organizations (name, slug, owner_user_id, plan)
            VALUES (
                user_rec.username || '''s Organization', 
                user_rec.slug || '-org', 
                user_rec.id, 
                COALESCE(user_rec.role, 'business_starter')
            )
            RETURNING id INTO org_id;

            -- Add as Owner Member
            INSERT INTO organization_members (organization_id, user_id, role, status)
            VALUES (org_id, user_rec.id, 'owner', 'active');
            
            -- Update user's events to belong to organization
            UPDATE events SET organization_id = org_id WHERE user_id = user_rec.id;
            
            RAISE NOTICE 'Created organization for user: %', user_rec.username;
        END IF;
    END LOOP;
END $$;
