-- Migration 016: Add 'requested' to payment_status enum
-- Allows visitors to request payment from staff

-- Drop the existing constraint
ALTER TABLE albums DROP CONSTRAINT IF EXISTS albums_payment_status_check;

-- Add the new constraint with 'requested' option
ALTER TABLE albums ADD CONSTRAINT albums_payment_status_check 
    CHECK (payment_status IN ('unpaid', 'pending', 'requested', 'processing', 'paid'));

-- Also add 'pending' as a default if not exists (more intuitive than 'unpaid')
-- Update any NULL payment_status to 'pending'
UPDATE albums SET payment_status = 'pending' WHERE payment_status IS NULL;
