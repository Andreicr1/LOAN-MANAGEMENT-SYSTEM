var PromissoryNoteService = /** @class */ (function () {
    function PromissoryNoteService(dbService) {
        this.db = dbService.getDatabase();
    }
    PromissoryNoteService.prototype.getAllPromissoryNotes = function (filters) {
        var query = "\n      SELECT \n        pn.*,\n        d.request_number,\n        d.requested_amount as disbursement_amount,\n        d.request_date\n      FROM promissory_notes pn\n      INNER JOIN disbursements d ON pn.disbursement_id = d.id\n      WHERE 1=1\n    ";
        var params = [];
        if (filters === null || filters === void 0 ? void 0 : filters.status) {
            query += ' AND pn.status = ?';
            params.push(filters.status);
        }
        if (filters === null || filters === void 0 ? void 0 : filters.startDate) {
            query += ' AND date(pn.issue_date) >= ?';
            params.push(filters.startDate);
        }
        if (filters === null || filters === void 0 ? void 0 : filters.endDate) {
            query += ' AND date(pn.issue_date) <= ?';
            params.push(filters.endDate);
        }
        query += ' ORDER BY pn.created_at DESC';
        var stmt = this.db.prepare(query);
        return stmt.all.apply(stmt, params);
    };
    PromissoryNoteService.prototype.getPromissoryNoteById = function (id) {
        var stmt = this.db.prepare("\n      SELECT \n        pn.*,\n        d.request_number,\n        d.requested_amount as disbursement_amount,\n        d.request_date,\n        d.assets_list,\n        d.description\n      FROM promissory_notes pn\n      INNER JOIN disbursements d ON pn.disbursement_id = d.id\n      WHERE pn.id = ?\n    ");
        return stmt.get(id);
    };
    PromissoryNoteService.prototype.getByDisbursementId = function (disbursementId) {
        var stmt = this.db.prepare("\n      SELECT * FROM promissory_notes WHERE disbursement_id = ?\n    ");
        var row = stmt.get(disbursementId);
        if (!row)
            return null;
        return this.mapRowToPN(row);
    };
    PromissoryNoteService.prototype.createPromissoryNote = function (data) {
        try {
            // Check if PN already exists for this disbursement
            var existing = this.getByDisbursementId(data.disbursementId);
            if (existing) {
                return { success: false, error: 'Promissory note already exists for this disbursement' };
            }
            // Generate PN number: PN-YYYY-XXX
            var year = new Date().getFullYear();
            var countStmt = this.db.prepare("\n        SELECT COUNT(*) as count \n        FROM promissory_notes \n        WHERE pn_number LIKE ?\n      ");
            var count = countStmt.get("PN-".concat(year, "-%")).count;
            var pnNumber = "PN-".concat(year, "-").concat(String(count + 1).padStart(3, '0'));
            var stmt = this.db.prepare("\n        INSERT INTO promissory_notes (\n          disbursement_id, pn_number, principal_amount, \n          interest_rate, issue_date, due_date, status\n        ) VALUES (?, ?, ?, ?, ?, ?, 'Active')\n      ");
            var result = stmt.run(data.disbursementId, pnNumber, data.principalAmount, data.interestRate, data.issueDate, data.dueDate);
            return {
                success: true,
                promissoryNoteId: result.lastInsertRowid,
                pnNumber: pnNumber
            };
        }
        catch (error) {
            console.error('Create promissory note error:', error);
            return { success: false, error: 'Failed to create promissory note' };
        }
    };
    PromissoryNoteService.prototype.updatePromissoryNote = function (id, data) {
        try {
            var updates = [];
            var params = [];
            if (data.status !== undefined) {
                updates.push('status = ?');
                params.push(data.status);
            }
            if (data.generatedPnPath !== undefined) {
                updates.push('generated_pn_path = ?');
                params.push(data.generatedPnPath);
            }
            if (data.signedPnPath !== undefined) {
                updates.push('signed_pn_path = ?');
                params.push(data.signedPnPath);
            }
            if (data.settlementDate !== undefined) {
                updates.push('settlement_date = ?');
                params.push(data.settlementDate);
            }
            if (data.settlementAmount !== undefined) {
                updates.push('settlement_amount = ?');
                params.push(data.settlementAmount);
            }
            if (updates.length === 0) {
                return { success: false, error: 'No fields to update' };
            }
            params.push(id);
            var stmt = this.db.prepare("\n        UPDATE promissory_notes SET ".concat(updates.join(', '), " WHERE id = ?\n      "));
            stmt.run.apply(stmt, params);
            return { success: true };
        }
        catch (error) {
            console.error('Update promissory note error:', error);
            return { success: false, error: 'Failed to update promissory note' };
        }
    };
    PromissoryNoteService.prototype.settlePromissoryNote = function (id, settlementAmount, settlementDate) {
        try {
            var stmt = this.db.prepare("\n        UPDATE promissory_notes \n        SET status = 'Settled',\n            settlement_date = ?,\n            settlement_amount = ?\n        WHERE id = ? AND status = 'Active'\n      ");
            var result = stmt.run(settlementDate, settlementAmount, id);
            if (result.changes === 0) {
                return { success: false, error: 'Promissory note not found or already settled' };
            }
            // Update disbursement status
            var pn = this.getPromissoryNoteById(id);
            if (pn) {
                this.db.prepare("\n          UPDATE disbursements SET status = 'Settled' WHERE id = ?\n        ").run(pn.disbursement_id);
            }
            return { success: true };
        }
        catch (error) {
            console.error('Settle promissory note error:', error);
            return { success: false, error: 'Failed to settle promissory note' };
        }
    };
    // DECISION: Check for overdue PNs and update status automatically
    PromissoryNoteService.prototype.updateOverdueStatus = function () {
        var today = new Date().toISOString().split('T')[0];
        var stmt = this.db.prepare("\n      UPDATE promissory_notes \n      SET status = 'Overdue'\n      WHERE status = 'Active' AND date(due_date) < date(?)\n    ");
        var result = stmt.run(today);
        return result.changes;
    };
    PromissoryNoteService.prototype.mapRowToPN = function (row) {
        return {
            id: row.id,
            disbursementId: row.disbursement_id,
            pnNumber: row.pn_number,
            principalAmount: row.principal_amount,
            interestRate: row.interest_rate,
            issueDate: row.issue_date,
            dueDate: row.due_date,
            status: row.status,
            generatedPnPath: row.generated_pn_path,
            signedPnPath: row.signed_pn_path,
            settlementDate: row.settlement_date,
            settlementAmount: row.settlement_amount,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    };
    return PromissoryNoteService;
}());
module.exports = { PromissoryNoteService };
