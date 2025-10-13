"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClientService = void 0;
const Database = require('better-sqlite3');
class ClientService {
    constructor(db) {
        this.db = db;
    }
    getAllClients() {
        const stmt = this.db.prepare(`
      SELECT 
        c.*,
        u.username as creator_name
      FROM clients c
      LEFT JOIN users u ON c.created_by = u.id
      ORDER BY c.name ASC
    `);
        return stmt.all();
    }
    getActiveClients() {
        const stmt = this.db.prepare(`
      SELECT 
        c.*,
        u.username as creator_name
      FROM clients c
      LEFT JOIN users u ON c.created_by = u.id
      WHERE c.status = 'Active'
      ORDER BY c.name ASC
    `);
        return stmt.all();
    }
    getClientById(id) {
        const stmt = this.db.prepare(`
      SELECT 
        c.*,
        u.username as creator_name
      FROM clients c
      LEFT JOIN users u ON c.created_by = u.id
      WHERE c.id = ?
    `);
        return stmt.get(id);
    }
    getClientByTaxId(taxId) {
        const stmt = this.db.prepare(`
      SELECT * FROM clients WHERE tax_id = ?
    `);
        return stmt.get(taxId);
    }
    createClient(data) {
        var _a, _b, _c, _d;
        try {
            // Check if tax ID already exists
            const existing = this.getClientByTaxId(data.taxId);
            if (existing) {
                return { success: false, error: 'Client with this Tax ID already exists' };
            }
            const stmt = this.db.prepare(`
        INSERT INTO clients (
          name, tax_id, address, jurisdiction,
          contact_email, contact_phone, representative_name, representative_passport, representative_address,
          credit_limit, interest_rate_annual, day_basis, default_due_days, signatories,
          status, notes, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
            const result = stmt.run(data.name, data.taxId, data.address, data.jurisdiction, data.contactEmail || null, data.contactPhone || null, data.representativeName || null, data.representativePassport || null, data.representativeAddress || null, (_a = data.creditLimit) !== null && _a !== void 0 ? _a : null, (_b = data.interestRateAnnual) !== null && _b !== void 0 ? _b : null, (_c = data.dayBasis) !== null && _c !== void 0 ? _c : null, (_d = data.defaultDueDays) !== null && _d !== void 0 ? _d : null, data.signatories || null, data.status, data.notes || null, data.createdBy);
            return {
                success: true,
                clientId: result.lastInsertRowid,
                message: 'Client created successfully'
            };
        }
        catch (error) {
            console.error('Create client error:', error);
            return { success: false, error: error.message };
        }
    }
    updateClient(id, data) {
        try {
            const updates = [];
            const values = [];
            if (data.name !== undefined) {
                updates.push('name = ?');
                values.push(data.name);
            }
            if (data.taxId !== undefined) {
                // Check if new tax ID is already used by another client
                const existing = this.getClientByTaxId(data.taxId);
                if (existing && existing.id !== id) {
                    return { success: false, error: 'Another client with this Tax ID already exists' };
                }
                updates.push('tax_id = ?');
                values.push(data.taxId);
            }
            if (data.address !== undefined) {
                updates.push('address = ?');
                values.push(data.address);
            }
            if (data.jurisdiction !== undefined) {
                updates.push('jurisdiction = ?');
                values.push(data.jurisdiction);
            }
            if (data.contactEmail !== undefined) {
                updates.push('contact_email = ?');
                values.push(data.contactEmail);
            }
            if (data.contactPhone !== undefined) {
                updates.push('contact_phone = ?');
                values.push(data.contactPhone);
            }
            if (data.representativeName !== undefined) {
                updates.push('representative_name = ?');
                values.push(data.representativeName);
            }
            if (data.representativePassport !== undefined) {
                updates.push('representative_passport = ?');
                values.push(data.representativePassport);
            }
            if (data.representativeAddress !== undefined) {
                updates.push('representative_address = ?');
                values.push(data.representativeAddress);
            }
            if (data.creditLimit !== undefined) {
                updates.push('credit_limit = ?');
                values.push(data.creditLimit);
            }
            if (data.interestRateAnnual !== undefined) {
                updates.push('interest_rate_annual = ?');
                values.push(data.interestRateAnnual);
            }
            if (data.dayBasis !== undefined) {
                updates.push('day_basis = ?');
                values.push(data.dayBasis);
            }
            if (data.defaultDueDays !== undefined) {
                updates.push('default_due_days = ?');
                values.push(data.defaultDueDays);
            }
            if (data.signatories !== undefined) {
                updates.push('signatories = ?');
                values.push(data.signatories);
            }
            if (data.status !== undefined) {
                updates.push('status = ?');
                values.push(data.status);
            }
            if (data.notes !== undefined) {
                updates.push('notes = ?');
                values.push(data.notes);
            }
            if (updates.length === 0) {
                return { success: true, message: 'Nothing to update' };
            }
            values.push(id);
            const stmt = this.db.prepare(`
        UPDATE clients SET ${updates.join(', ')} WHERE id = ?
      `);
            stmt.run(...values);
            return { success: true, message: 'Client updated successfully' };
        }
        catch (error) {
            console.error('Update client error:', error);
            return { success: false, error: error.message };
        }
    }
    deleteClient(id) {
        try {
            // Check if client is used in any disbursements
            const disbursements = this.db.prepare(`
        SELECT COUNT(*) as count FROM disbursements WHERE client_id = ?
      `).get(id);
            if (disbursements.count > 0) {
                return {
                    success: false,
                    error: `Cannot delete client. ${disbursements.count} disbursement(s) are associated with this client. Set status to Inactive instead.`
                };
            }
            const stmt = this.db.prepare('DELETE FROM clients WHERE id = ?');
            stmt.run(id);
            return { success: true, message: 'Client deleted successfully' };
        }
        catch (error) {
            console.error('Delete client error:', error);
            return { success: false, error: error.message };
        }
    }
    getClientStats(clientId) {
        const stats = this.db.prepare(`
      SELECT 
        COUNT(*) as total_disbursements,
        SUM(CASE WHEN status = 'Approved' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pending,
        SUM(requested_amount) as total_requested
      FROM disbursements
      WHERE client_id = ?
    `).get(clientId);
        return stats;
    }
}
exports.ClientService = ClientService;
