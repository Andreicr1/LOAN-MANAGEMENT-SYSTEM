-- Add SignWell fields to existing database

-- Add SignWell columns to config table
ALTER TABLE config ADD COLUMN signwell_api_token TEXT;
ALTER TABLE config ADD COLUMN signwell_test_mode INTEGER DEFAULT 1;

-- Add SignWell columns to promissory_notes table
ALTER TABLE promissory_notes ADD COLUMN signwell_document_id TEXT;
ALTER TABLE promissory_notes ADD COLUMN signwell_status TEXT;
ALTER TABLE promissory_notes ADD COLUMN signwell_embed_url TEXT;
ALTER TABLE promissory_notes ADD COLUMN signwell_completed_at TEXT;

-- Add SignWell columns to disbursements table  
ALTER TABLE disbursements ADD COLUMN wire_transfer_signwell_document_id TEXT;
ALTER TABLE disbursements ADD COLUMN wire_transfer_signwell_status TEXT;
ALTER TABLE disbursements ADD COLUMN wire_transfer_signwell_embed_url TEXT;

-- Insert default token (API Key)
UPDATE config 
SET 
  signwell_api_token = 'YWNjZXNzOjJhMWM2Y2FjYWI0ZGU2MmY0YjhjYTM0ZjFiNGY0MGU5',
  signwell_test_mode = 1
WHERE id = 1;

SELECT 'SignWell fields added successfully!' as result;

