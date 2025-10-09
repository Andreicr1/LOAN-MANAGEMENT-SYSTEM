-- Add DocuSign envelope IDs and status fields
ALTER TABLE promissory_notes ADD COLUMN envelope_id TEXT;
ALTER TABLE promissory_notes ADD COLUMN signature_status TEXT DEFAULT 'pending';
ALTER TABLE promissory_notes ADD COLUMN signature_date TEXT;

ALTER TABLE disbursements ADD COLUMN wire_transfer_envelope_id TEXT;
ALTER TABLE disbursements ADD COLUMN wire_transfer_signature_status TEXT DEFAULT 'pending';
ALTER TABLE disbursements ADD COLUMN wire_transfer_signature_date TEXT;
ALTER TABLE disbursements ADD COLUMN wire_transfer_signed_path TEXT;
ALTER TABLE disbursements ADD COLUMN bank_email_sent_date TEXT;
ALTER TABLE disbursements ADD COLUMN wire_transfer_path TEXT;

-- Add DocuSign configuration to config table
ALTER TABLE config ADD COLUMN docusign_integration_key TEXT;
ALTER TABLE config ADD COLUMN docusign_account_id TEXT;
ALTER TABLE config ADD COLUMN docusign_base_path TEXT DEFAULT 'https://demo.docusign.net/restapi';
ALTER TABLE config ADD COLUMN docusign_oauth_base_path TEXT DEFAULT 'https://account-d.docusign.com';
ALTER TABLE config ADD COLUMN webhook_url TEXT;
ALTER TABLE config ADD COLUMN webhook_secret TEXT;
ALTER TABLE config ADD COLUMN email_host TEXT DEFAULT 'smtp.gmail.com';
ALTER TABLE config ADD COLUMN email_port INTEGER DEFAULT 587;
ALTER TABLE config ADD COLUMN email_secure INTEGER DEFAULT 0;
ALTER TABLE config ADD COLUMN email_user TEXT DEFAULT 'operations@wmf-corp.com';
ALTER TABLE config ADD COLUMN email_pass TEXT;
ALTER TABLE config ADD COLUMN bank_email TEXT;

-- Create table to track DocuSign envelopes
CREATE TABLE IF NOT EXISTS docusign_envelopes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  envelope_id TEXT UNIQUE NOT NULL,
  document_type TEXT NOT NULL, -- 'PN' or 'WT'
  document_id INTEGER NOT NULL,
  disbursement_id INTEGER NOT NULL,
  status TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (disbursement_id) REFERENCES disbursements (id)
);
