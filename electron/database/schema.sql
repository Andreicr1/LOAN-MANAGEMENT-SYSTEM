-- Loan Management System Database Schema
-- DECISION: Using SQLite for embedded, zero-config database

-- ==================== CONFIG (Singleton) ====================
CREATE TABLE IF NOT EXISTS config (
  id INTEGER PRIMARY KEY CHECK (id = 1), -- Enforce singleton
  credit_limit_total REAL NOT NULL DEFAULT 50000000.00,
  interest_rate_annual REAL NOT NULL DEFAULT 14.50,
  day_basis INTEGER NOT NULL DEFAULT 360 CHECK (day_basis IN (360, 365)),
  default_due_days INTEGER NOT NULL DEFAULT 90,
  pn_number_format TEXT NOT NULL DEFAULT 'PN-{YEAR}-{SEQ}',
  
  -- Lender data (WMF Corp)
  lender_name TEXT NOT NULL DEFAULT 'WMF Corp',
  lender_tax_id TEXT NOT NULL DEFAULT 'N/A',
  lender_address TEXT NOT NULL DEFAULT 'P.O. Box 309, Ugland House, Grand Cayman, KY1-1104, Cayman Islands',
  lender_jurisdiction TEXT NOT NULL DEFAULT 'Cayman Islands',
  
  -- Borrower data (Whole Max)
  borrower_name TEXT NOT NULL DEFAULT 'Whole Max',
  borrower_tax_id TEXT NOT NULL DEFAULT '65-1234567',
  borrower_address TEXT NOT NULL DEFAULT '1234 Commerce Boulevard, Miami, FL 33101, United States',
  borrower_jurisdiction TEXT NOT NULL DEFAULT 'Florida, USA',
  lender_signatories TEXT,
  borrower_signatories TEXT,
  
  -- DocuSign Integration
  docusign_integration_key TEXT,
  docusign_account_id TEXT,
  docusign_user_id TEXT,
  docusign_base_path TEXT DEFAULT 'https://demo.docusign.net/restapi',
  webhook_url TEXT,
  webhook_secret TEXT,
  
  -- Email Configuration
  email_host TEXT DEFAULT 'mail.infomaniak.com',
  email_port INTEGER DEFAULT 587,
  email_secure INTEGER DEFAULT 0,
  email_user TEXT DEFAULT 'operations@wmf-corp.com',
  email_pass TEXT,
  bank_email TEXT,
  
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Insert default config with DocuSign credentials
INSERT OR IGNORE INTO config (
  id,
  docusign_integration_key,
  docusign_account_id,
  docusign_user_id,
  docusign_base_path,
  email_host,
  email_port,
  email_secure,
  email_user,
  email_pass
) VALUES (
  1,
  '2200e5dd-3ef2-40a8-bc5e-facfa2653b95',
  '5d45cf48-f587-45ce-a6f4-f8693c714f7c',
  '00246cfe-b264-45f4-aeff-82e51cb93ed1',
  'https://demo.docusign.net/restapi',
  'mail.infomaniak.com',
  587,
  0,
  'operations@wmf-corp.com',
  '2fEfeUwtPxYQPNqp'
);

-- ==================== USERS ====================
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'operator', 'viewer')),
  full_name TEXT NOT NULL,
  email TEXT,
  must_change_password INTEGER NOT NULL DEFAULT 1, -- Boolean: first login
  is_active INTEGER NOT NULL DEFAULT 1,
  last_login DATETIME,
  created_by INTEGER,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Create default admin user (password: admin123 - must be changed on first login)
-- DECISION: Using bcrypt with 10 rounds for password hashing (industry standard)
INSERT OR IGNORE INTO users (id, username, password_hash, role, full_name, must_change_password)
VALUES (1, 'admin', '$2a$10$BIFAz.JFTZRjzzM805OG0uBnY2AqmF2hXkZNe7aeaUIQArYr3GlLu', 'admin', 'System Administrator', 1);

-- ==================== AUDIT LOG ====================
CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  action TEXT NOT NULL,
  details TEXT, -- JSON string
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Index for fast filtering
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id);

-- ==================== CLIENTS ====================
CREATE TABLE IF NOT EXISTS clients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  tax_id TEXT NOT NULL UNIQUE,
  address TEXT NOT NULL,
  jurisdiction TEXT NOT NULL,
  contact_email TEXT,
  contact_phone TEXT,
  
  -- Credit line configuration per client
  credit_limit REAL NOT NULL DEFAULT 50000000.00,
  interest_rate_annual REAL NOT NULL DEFAULT 14.50,
  day_basis INTEGER NOT NULL DEFAULT 360 CHECK (day_basis IN (360, 365)),
  default_due_days INTEGER NOT NULL DEFAULT 90,
  
  signatories TEXT, -- JSON string array
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
  notes TEXT,
  created_by INTEGER NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_client_status ON clients(status);
CREATE INDEX IF NOT EXISTS idx_client_tax_id ON clients(tax_id);

-- Insert default client (Whole Max - using borrower info from config)
INSERT OR IGNORE INTO clients (id, name, tax_id, address, jurisdiction, credit_limit, interest_rate_annual, day_basis, default_due_days, status, created_by)
VALUES (1, 'Whole Max', '65-1234567', '1234 Commerce Boulevard, Miami, FL 33101, United States', 'Florida, USA', 50000000.00, 14.50, 360, 90, 'Active', 1);

-- ==================== DISBURSEMENTS ====================
CREATE TABLE IF NOT EXISTS disbursements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_number TEXT NOT NULL UNIQUE,
  client_id INTEGER NOT NULL DEFAULT 1,
  requested_amount REAL NOT NULL CHECK (requested_amount > 0),
  request_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Disbursed', 'Settled', 'Cancelled')),
  assets_list TEXT, -- JSON array of assets
  description TEXT,
  
  -- Attachments
  request_attachment_path TEXT,
  signed_request_path TEXT,
  
  -- Wire Transfer fields
  wire_transfer_path TEXT,
  wire_transfer_envelope_id TEXT,
  wire_transfer_signature_status TEXT DEFAULT 'pending',
  wire_transfer_signature_date TEXT,
  wire_transfer_signed_path TEXT,
  bank_email_sent_date TEXT,
  
  -- Approval tracking
  approved_by INTEGER,
  approved_at DATETIME,
  
  created_by INTEGER NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (client_id) REFERENCES clients(id),
  FOREIGN KEY (approved_by) REFERENCES users(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_disbursement_status ON disbursements(status);
CREATE INDEX IF NOT EXISTS idx_disbursement_date ON disbursements(request_date);
CREATE INDEX IF NOT EXISTS idx_disbursement_client ON disbursements(client_id);

-- ==================== PROMISSORY NOTES ====================
CREATE TABLE IF NOT EXISTS promissory_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  disbursement_id INTEGER NOT NULL UNIQUE, -- 1:1 relationship
  pn_number TEXT NOT NULL UNIQUE,
  principal_amount REAL NOT NULL CHECK (principal_amount > 0),
  interest_rate REAL NOT NULL,
  issue_date DATE NOT NULL,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Settled', 'Overdue', 'Cancelled')),
  
  -- Document paths
  generated_pn_path TEXT,
  signed_pn_path TEXT,
  
  -- DocuSign fields
  envelope_id TEXT,
  signature_status TEXT DEFAULT 'pending',
  signature_date TEXT,
  
  -- Settlement
  settlement_date DATE,
  settlement_amount REAL,
  
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (disbursement_id) REFERENCES disbursements(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_pn_status ON promissory_notes(status);
CREATE INDEX IF NOT EXISTS idx_pn_due_date ON promissory_notes(due_date);

-- ==================== BANK TRANSACTIONS ====================
CREATE TABLE IF NOT EXISTS bank_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  promissory_note_id INTEGER,
  transaction_date DATE NOT NULL,
  amount REAL NOT NULL,
  description TEXT,
  reference TEXT,
  
  -- Matching
  matched INTEGER NOT NULL DEFAULT 0, -- Boolean
  matched_at DATETIME,
  matched_by INTEGER,
  
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (promissory_note_id) REFERENCES promissory_notes(id) ON DELETE SET NULL,
  FOREIGN KEY (matched_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_bank_transaction_date ON bank_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_bank_transaction_matched ON bank_transactions(matched);

-- ==================== INTEREST CALCULATIONS (Cache) ====================
CREATE TABLE IF NOT EXISTS interest_calculations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  promissory_note_id INTEGER NOT NULL,
  calculation_date DATE NOT NULL,
  days_outstanding INTEGER NOT NULL,
  accumulated_interest REAL NOT NULL,
  
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (promissory_note_id) REFERENCES promissory_notes(id) ON DELETE CASCADE,
  UNIQUE(promissory_note_id, calculation_date)
);

CREATE INDEX IF NOT EXISTS idx_interest_pn ON interest_calculations(promissory_note_id);

-- ==================== DEBIT NOTES ====================
CREATE TABLE IF NOT EXISTS debit_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  dn_number TEXT NOT NULL UNIQUE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_interest REAL NOT NULL,
  issue_date DATE NOT NULL,
  due_date DATE NOT NULL,
  pdf_path TEXT,
  status TEXT NOT NULL DEFAULT 'Issued' CHECK (status IN ('Issued', 'Paid', 'Overdue')),
  
  created_by INTEGER NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_debit_note_period ON debit_notes(period_start, period_end);

-- ==================== DEBIT NOTE LINE ITEMS ====================
CREATE TABLE IF NOT EXISTS debit_note_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  debit_note_id INTEGER NOT NULL,
  promissory_note_id INTEGER NOT NULL,
  principal_amount REAL NOT NULL,
  days INTEGER NOT NULL,
  rate REAL NOT NULL,
  interest_amount REAL NOT NULL,
  
  FOREIGN KEY (debit_note_id) REFERENCES debit_notes(id) ON DELETE CASCADE,
  FOREIGN KEY (promissory_note_id) REFERENCES promissory_notes(id)
);

-- ==================== DOCUSIGN ENVELOPES ====================
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

CREATE INDEX IF NOT EXISTS idx_envelope_id ON docusign_envelopes(envelope_id);
CREATE INDEX IF NOT EXISTS idx_envelope_disbursement ON docusign_envelopes(disbursement_id);

-- ==================== CLIENTS ====================
CREATE TABLE IF NOT EXISTS clients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  tax_id TEXT NOT NULL UNIQUE,
  address TEXT NOT NULL,
  jurisdiction TEXT NOT NULL,
  contact_email TEXT,
  contact_phone TEXT,
  signatories TEXT, -- JSON array of signatories
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
  notes TEXT,
  created_by INTEGER NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_client_status ON clients(status);
CREATE INDEX IF NOT EXISTS idx_client_tax_id ON clients(tax_id);

-- Insert Whole Max as first client
INSERT OR IGNORE INTO clients (id, name, tax_id, address, jurisdiction, contact_email, signatories, status, created_by) 
VALUES (
  1,
  'Whole Max',
  '65-1234567',
  '1234 Commerce Boulevard, Miami, FL 33101, United States',
  'Florida, USA',
  'contact@wholemax.com',
  '[{"name":"Robert Johnson","email":"robert@wholemax.com","role":"Director"},{"name":"Maria Garcia","email":"maria@wholemax.com","role":"Financial Manager"}]',
  'Active',
  1
);

-- ==================== TRIGGERS FOR UPDATED_AT ====================
CREATE TRIGGER IF NOT EXISTS update_config_timestamp 
AFTER UPDATE ON config
BEGIN
  UPDATE config SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_users_timestamp 
AFTER UPDATE ON users
BEGIN
  UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_disbursements_timestamp 
AFTER UPDATE ON disbursements
BEGIN
  UPDATE disbursements SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_promissory_notes_timestamp 
AFTER UPDATE ON promissory_notes
BEGIN
  UPDATE promissory_notes SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_clients_timestamp 
AFTER UPDATE ON clients
BEGIN
  UPDATE clients SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

