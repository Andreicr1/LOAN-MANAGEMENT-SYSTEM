import type DatabaseNS from 'better-sqlite3'
const Database = require('better-sqlite3') as typeof import('better-sqlite3')
const fs = require('fs')
const path = require('path')

export class DatabaseService {
  private db: DatabaseNS.Database

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
    const resourcesPath = ((process as any).resourcesPath || '');
    const possiblePaths = [
      path.join(__dirname, 'schema.sql'),
      path.join(__dirname, 'database', 'schema.sql'),
      path.join(process.cwd(), 'electron', 'database', 'schema.sql'),
      path.join(resourcesPath, 'database', 'schema.sql')
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
    
    // Run migrations BEFORE executing schema
    this.runMigrations()
    
    // Execute schema (supports multiple statements)
    try {
      this.db.exec(schema)
      console.log('Database schema initialized successfully')
    } catch (err) {
      console.error('Error executing schema:', err)
      throw err
    }
  }

  private runMigrations() {
    try {
      // ========== MIGRATION 1: Add integration columns to config table ==========
      const configCols = this.db.pragma('table_info(config)') as any[]
      const hasDocuSignCols = configCols.some(col => col.name === 'docusign_integration_key')
      
      if (!hasDocuSignCols) {
        console.log('Running migration: Adding integration columns to config table...')
        
        const configMigrations = [
          { sql: 'ALTER TABLE config ADD COLUMN docusign_integration_key TEXT', name: 'docusign_integration_key' },
          { sql: 'ALTER TABLE config ADD COLUMN docusign_account_id TEXT', name: 'docusign_account_id' },
          { sql: 'ALTER TABLE config ADD COLUMN docusign_user_id TEXT', name: 'docusign_user_id' },
          { sql: 'ALTER TABLE config ADD COLUMN docusign_base_path TEXT DEFAULT "https://demo.docusign.net/restapi"', name: 'docusign_base_path' },
          { sql: 'ALTER TABLE config ADD COLUMN webhook_url TEXT', name: 'webhook_url' },
          { sql: 'ALTER TABLE config ADD COLUMN webhook_secret TEXT', name: 'webhook_secret' },
          { sql: 'ALTER TABLE config ADD COLUMN email_host TEXT DEFAULT "mail.infomaniak.com"', name: 'email_host' },
          { sql: 'ALTER TABLE config ADD COLUMN email_port INTEGER DEFAULT 587', name: 'email_port' },
          { sql: 'ALTER TABLE config ADD COLUMN email_secure INTEGER DEFAULT 0', name: 'email_secure' },
          { sql: 'ALTER TABLE config ADD COLUMN email_user TEXT DEFAULT "operations@wmf-corp.com"', name: 'email_user' },
          { sql: 'ALTER TABLE config ADD COLUMN email_pass TEXT', name: 'email_pass' },
          { sql: 'ALTER TABLE config ADD COLUMN bank_email TEXT', name: 'bank_email' }
        ]
        
        for (const migration of configMigrations) {
          try {
            this.db.exec(migration.sql)
            console.log(`  ✓ Added column: ${migration.name}`)
          } catch (err: any) {
            const colExists = configCols.some(col => col.name === migration.name)
            if (colExists) {
              console.log(`  - Column already exists: ${migration.name}`)
            } else {
              console.error(`  ✗ Failed to add column ${migration.name}:`, err.message)
            }
          }
        }
        
        // Set default values for existing config
        try {
          this.db.exec(`
            UPDATE config SET 
              docusign_integration_key = '2200e5dd-3ef2-40a8-bc5e-facfa2653b95',
              docusign_account_id = '5d45cf48-f587-45ce-a6f4-f8693c714f7c',
              docusign_user_id = '00246cfe-b264-45f4-aeff-82e51cb93ed1',
              docusign_base_path = 'https://demo.docusign.net/restapi',
              email_host = 'mail.infomaniak.com',
              email_port = 587,
              email_secure = 0,
              email_user = 'operations@wmf-corp.com',
              email_pass = '2fEfeUwtPxYQPNqp'
            WHERE id = 1 AND docusign_integration_key IS NULL
          `)
          console.log('  ✓ Set default integration values')
        } catch (err: any) {
          console.log('  - Default values already set or error:', err.message)
        }
        
        // Force update DocuSign credentials to correct values (fix wrong integration key)
        try {
          const currentConfig = this.db.prepare('SELECT docusign_integration_key FROM config WHERE id = 1').get() as any
          if (currentConfig && currentConfig.docusign_integration_key !== '2200e5dd-3ef2-40a8-bc5e-facfa2653b95') {
            this.db.exec(`
              UPDATE config SET 
                docusign_integration_key = '2200e5dd-3ef2-40a8-bc5e-facfa2653b95',
                docusign_account_id = '5d45cf48-f587-45ce-a6f4-f8693c714f7c',
                docusign_user_id = '00246cfe-b264-45f4-aeff-82e51cb93ed1',
                updated_at = CURRENT_TIMESTAMP
              WHERE id = 1
            `)
            console.log('  ✓ Updated DocuSign credentials to correct values')
          }
        } catch (err: any) {
          console.log('  - DocuSign credentials update error:', err.message)
        }
        
        console.log('Config integration columns migration completed successfully')
      } else {
        console.log('Config integration columns already exist, skipping migration')
      }
      
      // ========== MIGRATION 2: Add client credit line columns ==========
      // First check if clients table exists
      const tables = this.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='clients'").all()
      
      if (tables.length === 0) {
        console.log('Clients table does not exist yet, skipping client migration')
        return
      }
      
      // Check if clients table has credit_limit column
      const tableInfo = this.db.pragma('table_info(clients)') as any[]
      const hasClientColumns = tableInfo.some(col => col.name === 'credit_limit')
      
      if (!hasClientColumns) {
        console.log('Running migration: Adding client credit line columns...')
        
        // Add columns one by one with error handling
        const migrations = [
          { sql: 'ALTER TABLE clients ADD COLUMN credit_limit REAL NOT NULL DEFAULT 50000000.00', name: 'credit_limit' },
          { sql: 'ALTER TABLE clients ADD COLUMN interest_rate_annual REAL NOT NULL DEFAULT 14.50', name: 'interest_rate_annual' },
          { sql: 'ALTER TABLE clients ADD COLUMN day_basis INTEGER NOT NULL DEFAULT 360', name: 'day_basis' },
          { sql: 'ALTER TABLE clients ADD COLUMN default_due_days INTEGER NOT NULL DEFAULT 90', name: 'default_due_days' },
          { sql: 'ALTER TABLE clients ADD COLUMN signatories TEXT', name: 'signatories' }
        ]
        
        for (const migration of migrations) {
          try {
            this.db.exec(migration.sql)
            console.log(`  ✓ Added column: ${migration.name}`)
          } catch (err: any) {
            // Column might already exist, check if that's the case
            const colExists = tableInfo.some(col => col.name === migration.name)
            if (colExists) {
              console.log(`  - Column already exists: ${migration.name}`)
            } else {
              console.error(`  ✗ Failed to add column ${migration.name}:`, err.message)
            }
          }
        }
        
        console.log('Client columns migration completed successfully')
      } else {
        console.log('Client columns already exist, skipping client migration')
      }

      // Ensure representative metadata columns exist on clients table
      const ensureClientColumn = (column: string, sql: string) => {
        const cols = this.db.pragma('table_info(clients)') as any[]
        if (!cols.some(col => col.name === column)) {
          try {
            this.db.exec(sql)
            console.log(`  Added clients.${column} column`)
          } catch (err: any) {
            const alreadyExists = (err?.message || '').includes('duplicate column')
            if (alreadyExists) {
              console.log(`  - clients.${column} column already exists`)
            } else {
              console.error(`  Failed to add clients.${column}:`, err.message)
            }
          }
        }
      }

      ensureClientColumn('representative_name', 'ALTER TABLE clients ADD COLUMN representative_name TEXT')
      ensureClientColumn('representative_passport', 'ALTER TABLE clients ADD COLUMN representative_passport TEXT')
      ensureClientColumn('representative_address', 'ALTER TABLE clients ADD COLUMN representative_address TEXT')
      
      // ========== MIGRATION 3: Add SignWell columns ==========
      const hasSignwellCols = configCols.some(col => col.name === 'signwell_api_key')
      
      if (!hasSignwellCols) {
        console.log('Running migration: Adding SignWell columns to config table...')
        
        const signwellMigrations = [
          { sql: 'ALTER TABLE config ADD COLUMN signwell_application_id TEXT', name: 'signwell_application_id' },
          { sql: 'ALTER TABLE config ADD COLUMN signwell_client_id TEXT', name: 'signwell_client_id' },
          { sql: 'ALTER TABLE config ADD COLUMN signwell_secret_key TEXT', name: 'signwell_secret_key' },
          { sql: 'ALTER TABLE config ADD COLUMN signwell_api_key TEXT', name: 'signwell_api_key' },
          { sql: 'ALTER TABLE config ADD COLUMN signwell_test_mode INTEGER DEFAULT 1', name: 'signwell_test_mode' }
        ]
        
        for (const migration of signwellMigrations) {
          try {
            this.db.exec(migration.sql)
            console.log(`  ✓ Added column: ${migration.name}`)
          } catch (err: any) {
            console.log(`  - Column ${migration.name} already exists or error:`, err.message)
          }
        }
        
        // Add SignWell columns to promissory_notes
        try {
          this.db.exec('ALTER TABLE promissory_notes ADD COLUMN signwell_document_id TEXT')
          this.db.exec('ALTER TABLE promissory_notes ADD COLUMN signwell_status TEXT')
          this.db.exec('ALTER TABLE promissory_notes ADD COLUMN signwell_embed_url TEXT')
          this.db.exec('ALTER TABLE promissory_notes ADD COLUMN signwell_completed_at TEXT')
          console.log('  ✓ Added SignWell columns to promissory_notes')
        } catch (err: any) {
          console.log('  - SignWell columns in promissory_notes already exist')
        }
        
        // Add SignWell columns to disbursements
        try {
          this.db.exec('ALTER TABLE disbursements ADD COLUMN wire_transfer_signwell_document_id TEXT')
          this.db.exec('ALTER TABLE disbursements ADD COLUMN wire_transfer_signwell_status TEXT')
          this.db.exec('ALTER TABLE disbursements ADD COLUMN wire_transfer_signwell_embed_url TEXT')
          console.log('  ✓ Added SignWell columns to disbursements')
        } catch (err: any) {
          console.log('  - SignWell columns in disbursements already exist')
        }
        
        // Set default SignWell credentials
        try {
          this.db.exec(`
            UPDATE config SET 
              signwell_api_key = 'YWNjZXNzOjJhMWM2Y2FjYWI0ZGU2MmY0YjhjYTM0ZjFiNGY0MGU5',
              signwell_app_unique_id = 'ac92e9b6-d96e-4b74-a7a7-9466d106338b',
              signwell_test_mode = 1
            WHERE id = 1 AND signwell_api_key IS NULL
          `)
          console.log('  ✓ Set default SignWell credentials')
        } catch (err: any) {
          console.log('  - SignWell credentials already set')
        }
        
        // Force update to latest SignWell credentials
        try {
          this.db.exec(`
            UPDATE config SET 
              signwell_api_key = 'YWNjZXNzOjJhMWM2Y2FjYWI0ZGU2MmY0YjhjYTM0ZjFiNGY0MGU5',
              signwell_app_unique_id = 'ac92e9b6-d96e-4b74-a7a7-9466d106338b'
            WHERE id = 1
          `)
          console.log('  ✓ Updated SignWell to latest API Key')
        } catch (err: any) {
          console.log('  - API Key update error:', err.message)
        }
        
        console.log('SignWell migration completed successfully')
      } else {
        console.log('SignWell columns already exist, skipping migration')
      }
      
    } catch (err) {
      console.error('Migration error:', err)
      // Don't throw, allow initialization to continue
    }
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

  getDatabase(): DatabaseNS.Database {
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

