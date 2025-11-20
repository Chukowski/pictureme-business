-- Migration 002: Add Roles and Enterprise Applications
-- Adds role column to users and creates enterprise_applications table

-- =====================
-- 1. ADD ROLE TO USERS
-- =====================
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'individual';
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- =====================
-- 2. ENTERPRISE APPLICATIONS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS enterprise_applications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  full_name VARCHAR(255) NOT NULL,
  company_name VARCHAR(255),
  email VARCHAR(255) NOT NULL,
  location VARCHAR(255),
  event_types JSONB DEFAULT '[]'::jsonb,
  monthly_events VARCHAR(50),
  hardware JSONB DEFAULT '[]'::jsonb,
  tier VARCHAR(50) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_applications_email ON enterprise_applications(email);
CREATE INDEX IF NOT EXISTS idx_applications_status ON enterprise_applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_user_id ON enterprise_applications(user_id);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_applications_updated_at ON enterprise_applications;
CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON enterprise_applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
