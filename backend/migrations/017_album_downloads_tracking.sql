-- Migration: Add album_downloads table for tracking staff downloads (print/sales analytics)
-- This tracks when staff downloads album photos, useful for print station analytics

CREATE TABLE IF NOT EXISTS album_downloads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    album_id UUID NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
    event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    photo_count INTEGER NOT NULL DEFAULT 0,
    downloaded_by VARCHAR(255), -- User ID or 'staff' for PIN-based access
    download_type VARCHAR(50) NOT NULL DEFAULT 'zip', -- 'zip', 'single', 'print'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for efficient queries by event
CREATE INDEX IF NOT EXISTS idx_album_downloads_event_id ON album_downloads(event_id);

-- Index for date-based queries
CREATE INDEX IF NOT EXISTS idx_album_downloads_created_at ON album_downloads(created_at);

-- Index for album-based queries
CREATE INDEX IF NOT EXISTS idx_album_downloads_album_id ON album_downloads(album_id);

COMMENT ON TABLE album_downloads IS 'Tracks when staff downloads album photos for print/sales analytics';
COMMENT ON COLUMN album_downloads.photo_count IS 'Number of photos included in the download';
COMMENT ON COLUMN album_downloads.downloaded_by IS 'User ID of the downloader, or "staff" for PIN-based access';
COMMENT ON COLUMN album_downloads.download_type IS 'Type of download: zip (all photos), single (one photo), print (print station)';
