-- Migration: Add Profile Fields (Birth Date and Avatar)
-- Date: 2025-11-24
-- Description: Adds birth_date and avatar_url columns to users table

ALTER TABLE users ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
