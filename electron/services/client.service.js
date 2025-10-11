const Database = require('better-sqlite3');

var ClientService = /** @class */ (function () {
    function ClientService(dbService) {
        this.db = dbService.getDatabase();
    }
    ClientService.prototype.getAllClients = function () {
        var stmt = this.db.prepare("\n      SELECT \n        c.*,\n        u.username as creator_name\n      FROM clients c\n      LEFT JOIN users u ON c.created_by = u.id\n      ORDER BY c.name ASC\n    ");
        return stmt.all();
    };
    ClientService.prototype.getActiveClients = function () {
        var stmt = this.db.prepare("\n      SELECT \n        c.*,\n        u.username as creator_name\n      FROM clients c\n      LEFT JOIN users u ON c.created_by = u.id\n      WHERE c.status = 'Active'\n      ORDER BY c.name ASC\n    ");
        return stmt.all();
    };
    ClientService.prototype.getClientById = function (id) {
        var stmt = this.db.prepare("\n      SELECT \n        c.*,\n        u.username as creator_name\n      FROM clients c\n      LEFT JOIN users u ON c.created_by = u.id\n      WHERE c.id = ?\n    ");
        return stmt.get(id);
    };
    ClientService.prototype.getClientByTaxId = function (taxId) {
        var stmt = this.db.prepare("\n      SELECT * FROM clients WHERE tax_id = ?\n    ");
        return stmt.get(taxId);
    };
    ClientService.prototype.createClient = function (data) {
        try {
            // Check if tax ID already exists
            var existing = this.getClientByTaxId(data.taxId);
            if (existing) {
                return { success: false, error: 'Client with this Tax ID already exists' };
            }
            var stmt = this.db.prepare("\n        INSERT INTO clients (\n          name, tax_id, address, jurisdiction,\n          contact_email, contact_phone,\n          credit_limit, interest_rate_annual, day_basis, default_due_days,\n          signatories, status, notes, created_by\n        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)\n      ");
            var result = stmt.run(
                data.name, 
                data.taxId, 
                data.address, 
                data.jurisdiction, 
                data.contactEmail || null, 
                data.contactPhone || null, 
                data.creditLimit || 50000000, 
                data.interestRateAnnual || 14.50, 
                data.dayBasis || 360, 
                data.defaultDueDays || 90,
                data.signatories || null, 
                data.status, 
                data.notes || null, 
                data.createdBy
            );
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
    };
    ClientService.prototype.updateClient = function (id, data) {
        try {
            var updates = [];
            var values = [];
            if (data.name !== undefined) {
                updates.push('name = ?');
                values.push(data.name);
            }
            if (data.taxId !== undefined) {
                // Check if new tax ID is already used by another client
                var existing = this.getClientByTaxId(data.taxId);
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
            var stmt = this.db.prepare("\n        UPDATE clients SET ".concat(updates.join(', '), " WHERE id = ?\n      "));
            stmt.run.apply(stmt, values);
            return { success: true, message: 'Client updated successfully' };
        }
        catch (error) {
            console.error('Update client error:', error);
            return { success: false, error: error.message };
        }
    };
    ClientService.prototype.deleteClient = function (id) {
        try {
            // Check if client is used in any disbursements
            var disbursements = this.db.prepare("\n        SELECT COUNT(*) as count FROM disbursements WHERE client_id = ?\n      ").get(id);
            if (disbursements.count > 0) {
                return {
                    success: false,
                    error: "Cannot delete client. ".concat(disbursements.count, " disbursement(s) are associated with this client. Set status to Inactive instead.")
                };
            }
            var stmt = this.db.prepare('DELETE FROM clients WHERE id = ?');
            stmt.run(id);
            return { success: true, message: 'Client deleted successfully' };
        }
        catch (error) {
            console.error('Delete client error:', error);
            return { success: false, error: error.message };
        }
    };
    ClientService.prototype.getClientStats = function (clientId) {
        var stats = this.db.prepare("\n      SELECT \n        COUNT(*) as total_disbursements,\n        SUM(CASE WHEN status = 'Approved' THEN 1 ELSE 0 END) as approved,\n        SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pending,\n        SUM(requested_amount) as total_requested\n      FROM disbursements\n      WHERE client_id = ?\n    ").get(clientId);
        return stats;
    };
    return ClientService;
}());

module.exports = { ClientService };

