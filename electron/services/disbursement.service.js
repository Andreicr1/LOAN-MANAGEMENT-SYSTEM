var DisbursementService = /** @class */ (function () {
    function DisbursementService(dbService) {
        this.db = dbService.getDatabase();
    }
    DisbursementService.prototype.getAllDisbursements = function (filters) {
        var _this = this;
        var query = "\n      SELECT \n        d.*,\n        u.full_name as approver_name\n      FROM disbursements d\n      LEFT JOIN users u ON d.approved_by = u.id\n      WHERE 1=1\n    ";
        var params = [];
        if (filters === null || filters === void 0 ? void 0 : filters.status) {
            query += ' AND d.status = ?';
            params.push(filters.status);
        }
        if (filters === null || filters === void 0 ? void 0 : filters.startDate) {
            query += ' AND date(d.request_date) >= ?';
            params.push(filters.startDate);
        }
        if (filters === null || filters === void 0 ? void 0 : filters.endDate) {
            query += ' AND date(d.request_date) <= ?';
            params.push(filters.endDate);
        }
        query += ' ORDER BY d.created_at DESC';
        var stmt = this.db.prepare(query);
        var rows = stmt.all.apply(stmt, params);
        return rows.map(function (row) { return _this.mapRowToDisbursement(row); });
    };
    DisbursementService.prototype.getDisbursementById = function (id) {
        var stmt = this.db.prepare("\n      SELECT \n        d.*,\n        u.full_name as approver_name\n      FROM disbursements d\n      LEFT JOIN users u ON d.approved_by = u.id\n      WHERE d.id = ?\n    ");
        var row = stmt.get(id);
        if (!row)
            return null;
        return this.mapRowToDisbursement(row);
    };
    DisbursementService.prototype.createDisbursement = function (data) {
        try {
            // Generate request number: REQ-YYYY-XXX
            var year = new Date().getFullYear();
            var countStmt = this.db.prepare("\n        SELECT COUNT(*) as count \n        FROM disbursements \n        WHERE request_number LIKE ?\n      ");
            var count = countStmt.get("REQ-".concat(year, "-%")).count;
            var requestNumber = "REQ-".concat(year, "-").concat(String(count + 1).padStart(3, '0'));
            var stmt = this.db.prepare("\n        INSERT INTO disbursements (\n          request_number, requested_amount, request_date, \n          assets_list, description, status, created_by\n        ) VALUES (?, ?, ?, ?, ?, 'Pending', ?)\n      ");
            var result = stmt.run(requestNumber, data.requestedAmount, data.requestDate, data.assetsList ? JSON.stringify(data.assetsList) : null, data.description, data.createdBy);
            return {
                success: true,
                disbursementId: result.lastInsertRowid,
                requestNumber: requestNumber
            };
        }
        catch (error) {
            console.error('Create disbursement error:', error);
            return { success: false, error: 'Failed to create disbursement' };
        }
    };
    DisbursementService.prototype.updateDisbursement = function (id, data) {
        try {
            var updates = [];
            var params = [];
            if (data.requestedAmount !== undefined) {
                updates.push('requested_amount = ?');
                params.push(data.requestedAmount);
            }
            if (data.requestDate !== undefined) {
                updates.push('request_date = ?');
                params.push(data.requestDate);
            }
            if (data.assetsList !== undefined) {
                updates.push('assets_list = ?');
                params.push(JSON.stringify(data.assetsList));
            }
            if (data.description !== undefined) {
                updates.push('description = ?');
                params.push(data.description);
            }
            if (data.status !== undefined) {
                updates.push('status = ?');
                params.push(data.status);
            }
            if (updates.length === 0) {
                return { success: false, error: 'No fields to update' };
            }
            params.push(id);
            var stmt = this.db.prepare("\n        UPDATE disbursements SET ".concat(updates.join(', '), " WHERE id = ?\n      "));
            stmt.run.apply(stmt, params);
            return { success: true };
        }
        catch (error) {
            console.error('Update disbursement error:', error);
            return { success: false, error: 'Failed to update disbursement' };
        }
    };
    DisbursementService.prototype.approveDisbursement = function (id, approvedBy, signedRequestPath) {
        try {
            var stmt = this.db.prepare("\n        UPDATE disbursements \n        SET status = 'Approved', \n            approved_by = ?, \n            approved_at = CURRENT_TIMESTAMP,\n            signed_request_path = ?\n        WHERE id = ? AND status = 'Pending'\n      ");
            var result = stmt.run(approvedBy, signedRequestPath || null, id);
            if (result.changes === 0) {
                return { success: false, error: 'Disbursement not found or already processed' };
            }
            return { success: true };
        }
        catch (error) {
            console.error('Approve disbursement error:', error);
            return { success: false, error: 'Failed to approve disbursement' };
        }
    };
    DisbursementService.prototype.uploadDocument = function (id, fieldName, filePath) {
        try {
            var field = fieldName === 'request_attachment'
                ? 'request_attachment_path'
                : 'signed_request_path';
            var stmt = this.db.prepare("\n        UPDATE disbursements SET ".concat(field, " = ? WHERE id = ?\n      "));
            stmt.run(filePath, id);
            return { success: true };
        }
        catch (error) {
            console.error('Upload document error:', error);
            return { success: false, error: 'Failed to upload document' };
        }
    };
    DisbursementService.prototype.cancelDisbursement = function (id) {
        try {
            var stmt = this.db.prepare("\n        UPDATE disbursements SET status = 'Cancelled' WHERE id = ?\n      ");
            stmt.run(id);
            return { success: true };
        }
        catch (error) {
            console.error('Cancel disbursement error:', error);
            return { success: false, error: 'Failed to cancel disbursement' };
        }
    };
    DisbursementService.prototype.mapRowToDisbursement = function (row) {
        return {
            id: row.id,
            requestNumber: row.request_number,
            requestedAmount: row.requested_amount,
            requestDate: row.request_date,
            status: row.status,
            assetsList: row.assets_list ? JSON.parse(row.assets_list) : undefined,
            description: row.description,
            requestAttachmentPath: row.request_attachment_path,
            signedRequestPath: row.signed_request_path,
            approvedBy: row.approved_by,
            approvedAt: row.approved_at,
            createdBy: row.created_by,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    };
    return DisbursementService;
}());
export { DisbursementService };
