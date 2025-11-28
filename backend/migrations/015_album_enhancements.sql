-- Migration 015: Album and Event Enhancements
-- Adds assigned_user_id to events for team assignment
-- Adds metadata column to album_photos for station tracking

-- Add assigned_user_id to events for team member assignment
ALTER TABLE events ADD COLUMN IF NOT EXISTS assigned_user_id INTEGER REFERENCES users(id);

-- Add metadata column to album_photos for station tracking (station_id, etc.)
ALTER TABLE album_photos ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Create index for faster lookups by assigned user
CREATE INDEX IF NOT EXISTS idx_events_assigned_user ON events(assigned_user_id);

-- Create index for station analytics queries
CREATE INDEX IF NOT EXISTS idx_album_photos_station ON album_photos(station_type);

