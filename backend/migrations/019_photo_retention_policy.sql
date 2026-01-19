-- =====================================================
-- Photo Retention Policy for Privacy Compliance
-- =====================================================
-- This migration adds support for automatic deletion of original photos
-- after a configurable retention period (default: 30 days)
-- 
-- Compliance: GDPR, CCPA, and general privacy best practices
-- =====================================================

-- Add retention tracking columns to processed_photos
ALTER TABLE processed_photos
ADD COLUMN IF NOT EXISTS original_photo_retention_days INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS original_photo_deleted_at TIMESTAMPTZ NULL,
ADD COLUMN IF NOT EXISTS original_photo_scheduled_deletion_at TIMESTAMPTZ NULL;

-- Create index for efficient cleanup queries
CREATE INDEX IF NOT EXISTS idx_processed_photos_scheduled_deletion 
ON processed_photos(original_photo_scheduled_deletion_at) 
WHERE original_photo_deleted_at IS NULL AND original_photo_scheduled_deletion_at IS NOT NULL;

-- Function to calculate scheduled deletion date
CREATE OR REPLACE FUNCTION calculate_scheduled_deletion_date(
  created_at TIMESTAMPTZ,
  retention_days INTEGER
) RETURNS TIMESTAMPTZ AS $$
BEGIN
  RETURN created_at + (retention_days || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update existing rows to set scheduled deletion date
UPDATE processed_photos
SET original_photo_scheduled_deletion_at = calculate_scheduled_deletion_date(created_at, original_photo_retention_days)
WHERE original_photo_scheduled_deletion_at IS NULL 
  AND original_photo_deleted_at IS NULL
  AND original_image_url IS NOT NULL
  AND original_image_url != processed_image_url;

-- Trigger to automatically set scheduled deletion date on new inserts
CREATE OR REPLACE FUNCTION set_scheduled_deletion_date()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.original_image_url IS NOT NULL 
     AND NEW.original_image_url != NEW.processed_image_url 
     AND NEW.original_photo_scheduled_deletion_at IS NULL THEN
    NEW.original_photo_scheduled_deletion_at := 
      calculate_scheduled_deletion_date(NEW.created_at, NEW.original_photo_retention_days);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_scheduled_deletion_date
BEFORE INSERT ON processed_photos
FOR EACH ROW
EXECUTE FUNCTION set_scheduled_deletion_date();

-- View to see photos pending deletion
CREATE OR REPLACE VIEW photos_pending_deletion AS
SELECT 
  id,
  original_image_url,
  created_at,
  original_photo_retention_days,
  original_photo_scheduled_deletion_at,
  EXTRACT(EPOCH FROM (original_photo_scheduled_deletion_at - NOW())) / 86400 AS days_until_deletion
FROM processed_photos
WHERE original_photo_deleted_at IS NULL
  AND original_photo_scheduled_deletion_at IS NOT NULL
  AND original_photo_scheduled_deletion_at <= NOW()
  AND original_image_url IS NOT NULL
  AND original_image_url != processed_image_url
ORDER BY original_photo_scheduled_deletion_at ASC;

-- Function to mark photos as deleted (called after actual deletion from R2)
CREATE OR REPLACE FUNCTION mark_original_photo_deleted(photo_id VARCHAR(255))
RETURNS VOID AS $$
BEGIN
  UPDATE processed_photos
  SET original_photo_deleted_at = NOW(),
      original_image_url = NULL  -- Remove URL reference after deletion
  WHERE id = photo_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON COLUMN processed_photos.original_photo_retention_days IS 'Number of days to retain original uploaded photo before deletion (default: 30)';
COMMENT ON COLUMN processed_photos.original_photo_deleted_at IS 'Timestamp when original photo was deleted from storage';
COMMENT ON COLUMN processed_photos.original_photo_scheduled_deletion_at IS 'Timestamp when original photo is scheduled for deletion';
COMMENT ON VIEW photos_pending_deletion IS 'Photos with original images that are past their retention period and ready for deletion';
