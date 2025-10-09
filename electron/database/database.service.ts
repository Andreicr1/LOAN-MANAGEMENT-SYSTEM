import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'

export class DatabaseService {
  private db: Database.Database

  constructor(dbPath: string) {
    // Ensure directory exists
    const dir = path.dirname(dbPath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    this.db = new Database(dbPath)
    this.db.pragma('journal_mode = WAL') // Better performance
    this.db.pragma('foreign_keys = ON')
    
    this.initialize()
  }

  private initialize() {
    // DECISION: Try multiple paths to find schema.sql (dev vs production)
    const possiblePaths = [
      path.join(__dirname, 'schema.sql'),
      path.join(__dirname, 'database', 'schema.sql'),
      path.join(process.cwd(), 'electron', 'database', 'schema.sql'),
      path.join(process.resourcesPath || '', 'database', 'schema.sql')
    ]

    let schema = ''
    for (const schemaPath of possiblePaths) {
      if (fs.existsSync(schemaPath)) {
        schema = fs.readFileSync(schemaPath, 'utf-8')
        console.log(`Schema loaded from: ${schemaPath}`)
        break
      }
    }

    if (!schema) {
      // Fallback: create minimal schema inline
      console.warn('Schema file not found, using inline schema')
      schema = this.getInlineSchema()
    }
    
    // Execute schema (supports multiple statements)
    this.db.exec(schema)
    
    console.log('Database schema initialized successfully')
  }

  private getInlineSchema(): string {
    // Minimal schema for fallback - full schema should be in schema.sql
    return `
      CREATE TABLE IF NOT EXISTS config (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        credit_limit_total REAL NOT NULL DEFAULT 50000000.00,
        interest_rate_annual REAL NOT NULL DEFAULT 14.50,
        day_basis INTEGER NOT NULL DEFAULT 360,
        default_due_days INTEGER NOT NULL DEFAULT 90,
        pn_number_format TEXT NOT NULL DEFAULT 'PN-{YEAR}-{SEQ}',
        lender_name TEXT NOT NULL DEFAULT 'WMF Corp',
        lender_tax_id TEXT NOT NULL DEFAULT 'N/A',
        lender_address TEXT NOT NULL DEFAULT 'P.O. Box 309, Ugland House, Grand Cayman, KY1-1104, Cayman Islands',
        lender_jurisdiction TEXT NOT NULL DEFAULT 'Cayman Islands',
        borrower_name TEXT NOT NULL DEFAULT 'Whole Max',
        borrower_tax_id TEXT NOT NULL DEFAULT '65-1234567',
        borrower_address TEXT NOT NULL DEFAULT '1234 Commerce Boulevard, Miami, FL 33101, United States',
        borrower_jurisdiction TEXT NOT NULL DEFAULT 'Florida, USA',
        lender_signatories TEXT,
        borrower_signatories TEXT,
        docusign_integration_key TEXT,
        docusign_account_id TEXT,
        docusign_base_path TEXT DEFAULT 'https://demo.docusign.net/restapi',
        docusign_oauth_base_path TEXT DEFAULT 'https://account-d.docusign.com',
        webhook_url TEXT,
        webhook_secret TEXT,
        email_host TEXT DEFAULT 'smtp.gmail.com',
        email_port INTEGER DEFAULT 587,
        email_secure INTEGER DEFAULT 0,
        email_user TEXT DEFAULT 'operations@wmf-corp.com',
        email_pass TEXT,
        bank_email TEXT,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      INSERT OR IGNORE INTO config (id) VALUES (1);
      
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('admin', 'operator', 'viewer')),
        full_name TEXT NOT NULL,
        email TEXT,
        must_change_password INTEGER NOT NULL DEFAULT 1,
        is_active INTEGER NOT NULL DEFAULT 1,
        last_login DATETIME,
        created_by INTEGER,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      INSERT OR IGNORE INTO users (id, username, password_hash, role, full_name, must_change_password)
      VALUES (1, 'admin', '$2a$10$BIFAz.JFTZRjzzM805OG0uBnY2AqmF2hXkZNe7aeaUIQArYr3GlLu', 'admin', 'System Administrator', 1);
    `
  }

  getDatabase(): Database.Database {
    return this.db
  }

  close() {
    this.db.close()
  }

  // ==================== AUDIT LOG ====================
  logAudit(userId: number, action: string, details: any) {
    const stmt = this.db.prepare(`
      INSERT INTO audit_log (user_id, action, details)
      VALUES (?, ?, ?)
    `)
    
    return stmt.run(userId, action, JSON.stringify(details))
  }

  getAuditLogs(filters?: { userId?: number, startDate?: string, endDate?: string }) {
    let query = 'SELECT * FROM audit_log WHERE 1=1'
    const params: any[] = []

    if (filters?.userId) {
      query += ' AND user_id = ?'
      params.push(filters.userId)
    }

    if (filters?.startDate) {
      query += ' AND date(timestamp) >= ?'
      params.push(filters.startDate)
    }

    if (filters?.endDate) {
      query += ' AND date(timestamp) <= ?'
      params.push(filters.endDate)
    }

    query += ' ORDER BY timestamp DESC LIMIT 1000'

    const stmt = this.db.prepare(query)
    return stmt.all(...params)
  }
}

