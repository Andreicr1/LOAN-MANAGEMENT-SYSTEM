import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
var DatabaseService = /** @class */ (function () {
    function DatabaseService(dbPath) {
        // Ensure directory exists
        var dir = path.dirname(dbPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        this.db = new Database(dbPath);
        this.db.pragma('journal_mode = WAL'); // Better performance
        this.db.pragma('foreign_keys = ON');
        this.initialize();
    }
    DatabaseService.prototype.initialize = function () {
        // DECISION: Try multiple paths to find schema.sql (dev vs production)
        var possiblePaths = [
            path.join(__dirname, 'schema.sql'),
            path.join(__dirname, 'database', 'schema.sql'),
            path.join(process.cwd(), 'electron', 'database', 'schema.sql'),
            path.join(process.resourcesPath || '', 'database', 'schema.sql')
        ];
        var schema = '';
        for (var _i = 0, possiblePaths_1 = possiblePaths; _i < possiblePaths_1.length; _i++) {
            var schemaPath = possiblePaths_1[_i];
            if (fs.existsSync(schemaPath)) {
                schema = fs.readFileSync(schemaPath, 'utf-8');
                console.log("Schema loaded from: ".concat(schemaPath));
                break;
            }
        }
        if (!schema) {
            // Fallback: create minimal schema inline
            console.warn('Schema file not found, using inline schema');
            schema = this.getInlineSchema();
        }
        // Execute schema (supports multiple statements)
        this.db.exec(schema);
        console.log('Database schema initialized successfully');
    };
    DatabaseService.prototype.getInlineSchema = function () {
        // Minimal schema for fallback - full schema should be in schema.sql
        return "\n      CREATE TABLE IF NOT EXISTS config (\n        id INTEGER PRIMARY KEY CHECK (id = 1),\n        credit_limit_total REAL NOT NULL DEFAULT 50000000.00,\n        interest_rate_annual REAL NOT NULL DEFAULT 14.50,\n        day_basis INTEGER NOT NULL DEFAULT 360,\n        default_due_days INTEGER NOT NULL DEFAULT 90,\n        pn_number_format TEXT NOT NULL DEFAULT 'PN-{YEAR}-{SEQ}',\n        lender_name TEXT NOT NULL DEFAULT 'WMF Corp',\n        lender_tax_id TEXT NOT NULL DEFAULT 'N/A',\n        lender_address TEXT NOT NULL DEFAULT 'P.O. Box 309, Ugland House, Grand Cayman, KY1-1104, Cayman Islands',\n        lender_jurisdiction TEXT NOT NULL DEFAULT 'Cayman Islands',\n        borrower_name TEXT NOT NULL DEFAULT 'Whole Max',\n        borrower_tax_id TEXT NOT NULL DEFAULT '65-1234567',\n        borrower_address TEXT NOT NULL DEFAULT '1234 Commerce Boulevard, Miami, FL 33101, United States',\n        borrower_jurisdiction TEXT NOT NULL DEFAULT 'Florida, USA',\n        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,\n        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP\n      );\n      INSERT OR IGNORE INTO config (id) VALUES (1);\n      \n      CREATE TABLE IF NOT EXISTS users (\n        id INTEGER PRIMARY KEY AUTOINCREMENT,\n        username TEXT NOT NULL UNIQUE,\n        password_hash TEXT NOT NULL,\n        role TEXT NOT NULL CHECK (role IN ('admin', 'operator', 'viewer')),\n        full_name TEXT NOT NULL,\n        email TEXT,\n        must_change_password INTEGER NOT NULL DEFAULT 1,\n        is_active INTEGER NOT NULL DEFAULT 1,\n        last_login DATETIME,\n        created_by INTEGER,\n        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,\n        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP\n      );\n      INSERT OR IGNORE INTO users (id, username, password_hash, role, full_name, must_change_password)\n      VALUES (1, 'admin', '$2a$10$BIFAz.JFTZRjzzM805OG0uBnY2AqmF2hXkZNe7aeaUIQArYr3GlLu', 'admin', 'System Administrator', 1);\n    ";
    };
    DatabaseService.prototype.getDatabase = function () {
        return this.db;
    };
    DatabaseService.prototype.close = function () {
        this.db.close();
    };
    // ==================== AUDIT LOG ====================
    DatabaseService.prototype.logAudit = function (userId, action, details) {
        var stmt = this.db.prepare("\n      INSERT INTO audit_log (user_id, action, details)\n      VALUES (?, ?, ?)\n    ");
        return stmt.run(userId, action, JSON.stringify(details));
    };
    DatabaseService.prototype.getAuditLogs = function (filters) {
        var query = 'SELECT * FROM audit_log WHERE 1=1';
        var params = [];
        if (filters === null || filters === void 0 ? void 0 : filters.userId) {
            query += ' AND user_id = ?';
            params.push(filters.userId);
        }
        if (filters === null || filters === void 0 ? void 0 : filters.startDate) {
            query += ' AND date(timestamp) >= ?';
            params.push(filters.startDate);
        }
        if (filters === null || filters === void 0 ? void 0 : filters.endDate) {
            query += ' AND date(timestamp) <= ?';
            params.push(filters.endDate);
        }
        query += ' ORDER BY timestamp DESC LIMIT 1000';
        var stmt = this.db.prepare(query);
        return stmt.all.apply(stmt, params);
    };
    return DatabaseService;
}());
export { DatabaseService };
