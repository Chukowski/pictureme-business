-- Migration: Create album_transactions table for payment tracking
-- This tracks all payment transactions for albums (POS charges, manual payments, etc.)

CREATE TABLE IF NOT EXISTS album_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    album_id UUID REFERENCES albums(id) ON DELETE SET NULL,
    event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    
    -- Pricing info
    package_id VARCHAR(100),              -- Reference to pricing package from event config
    package_name VARCHAR(255),            -- Stored package name at time of purchase
    item_count INTEGER DEFAULT 1,         -- Number of items (photos or albums)
    
    -- Amounts
    amount DECIMAL(10,2) NOT NULL,        -- Subtotal before tax
    tax_amount DECIMAL(10,2) DEFAULT 0,   -- Tax amount
    total_amount DECIMAL(10,2) NOT NULL,  -- Final total
    currency VARCHAR(10) DEFAULT 'USD',
    
    -- Payment details
    payment_method VARCHAR(50),           -- 'cash', 'card', 'stripe', 'external', 'other'
    status VARCHAR(20) DEFAULT 'completed', -- 'pending', 'completed', 'refunded', 'cancelled'
    
    -- Customer info (optional - for invoice generation)
    customer_name VARCHAR(255),
    customer_email VARCHAR(255),
    customer_phone VARCHAR(50),
    
    -- Invoice info
    invoice_number VARCHAR(50) UNIQUE,
    invoice_generated BOOLEAN DEFAULT FALSE,
    invoice_data JSONB,                   -- Stored invoice data for PDF regeneration
    
    -- Metadata
    notes TEXT,
    created_by VARCHAR(255),              -- Staff user ID who created the transaction
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_album_transactions_event_id ON album_transactions(event_id);
CREATE INDEX IF NOT EXISTS idx_album_transactions_album_id ON album_transactions(album_id);
CREATE INDEX IF NOT EXISTS idx_album_transactions_created_at ON album_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_album_transactions_status ON album_transactions(status);
CREATE INDEX IF NOT EXISTS idx_album_transactions_invoice ON album_transactions(invoice_number) WHERE invoice_number IS NOT NULL;

-- Function to generate invoice numbers
CREATE OR REPLACE FUNCTION generate_invoice_number(event_id_param INTEGER)
RETURNS VARCHAR(50) AS $$
DECLARE
    event_slug VARCHAR(100);
    seq_num INTEGER;
    invoice_num VARCHAR(50);
BEGIN
    -- Get event slug
    SELECT slug INTO event_slug FROM events WHERE id = event_id_param;
    
    -- Count existing invoices for this event + 1
    SELECT COUNT(*) + 1 INTO seq_num 
    FROM album_transactions 
    WHERE event_id = event_id_param AND invoice_number IS NOT NULL;
    
    -- Format: EVENT-YYYYMMDD-XXXX (e.g., BRICX-20251211-0001)
    invoice_num := UPPER(SUBSTRING(COALESCE(event_slug, 'INV'), 1, 5)) || '-' || 
                   TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || 
                   LPAD(seq_num::TEXT, 4, '0');
    
    RETURN invoice_num;
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE album_transactions IS 'Payment transactions for album/photo purchases';
COMMENT ON COLUMN album_transactions.package_id IS 'Reference to pricing package ID from event configuration';
COMMENT ON COLUMN album_transactions.payment_method IS 'Payment method: cash, card, stripe, external, other';
COMMENT ON COLUMN album_transactions.status IS 'Transaction status: pending, completed, refunded, cancelled';
COMMENT ON COLUMN album_transactions.invoice_data IS 'JSON data for invoice PDF regeneration';
COMMENT ON COLUMN album_transactions.created_by IS 'User ID of staff member who created the transaction';
