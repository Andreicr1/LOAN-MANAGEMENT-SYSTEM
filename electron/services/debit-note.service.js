var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
const { InterestService } = require('./interest.service');
var DebitNoteService = /** @class */ (function () {
    function DebitNoteService(dbService) {
        this.db = dbService.getDatabase();
        this.interestService = new InterestService(dbService);
    }
    DebitNoteService.prototype.getAllDebitNotes = function () {
        var stmt = this.db.prepare("\n      SELECT * FROM debit_notes\n      ORDER BY created_at DESC\n    ");
        var rows = stmt.all();
        return rows.map(function (row) { return ({
            id: row.id,
            dnNumber: row.dn_number,
            periodStart: row.period_start,
            periodEnd: row.period_end,
            totalInterest: row.total_interest,
            issueDate: row.issue_date,
            dueDate: row.due_date,
            status: row.status,
            pdfPath: row.pdf_path,
            createdBy: row.created_by,
            createdAt: row.created_at,
        }); });
    };
    DebitNoteService.prototype.getDebitNoteById = function (id) {
        var dnStmt = this.db.prepare("\n      SELECT dn.*, u.full_name as created_by_name\n      FROM debit_notes dn\n      LEFT JOIN users u ON dn.created_by = u.id\n      WHERE dn.id = ?\n    ");
        var debitNote = dnStmt.get(id);
        if (!debitNote)
            return null;
        // Get line items
        var itemsStmt = this.db.prepare("\n      SELECT \n        dni.*,\n        pn.pn_number\n      FROM debit_note_items dni\n      INNER JOIN promissory_notes pn ON dni.promissory_note_id = pn.id\n      WHERE dni.debit_note_id = ?\n      ORDER BY pn.pn_number\n    ");
        var items = itemsStmt.all(id);
        return __assign(__assign({}, debitNote), { items: items.map(function (item) { return ({
                promissoryNoteId: item.promissory_note_id,
                pnNumber: item.pn_number,
                principalAmount: item.principal_amount,
                days: item.days,
                rate: item.rate,
                interestAmount: item.interest_amount,
            }); }) });
    };
    DebitNoteService.prototype.createDebitNote = function (data) {
        try {
            // Generate DN number: DN-YYYY-MM-XXX
            var year = new Date().getFullYear();
            var month = String(new Date().getMonth() + 1).padStart(2, '0');
            var countStmt = this.db.prepare("\n        SELECT COUNT(*) as count \n        FROM debit_notes \n        WHERE dn_number LIKE ?\n      ");
            var count = countStmt.get("DN-".concat(year, "-").concat(month, "-%")).count;
            var dnNumber = "DN-".concat(year, "-").concat(month, "-").concat(String(count + 1).padStart(3, '0'));
            // Get all active PNs and calculate interest for the period
            var pnsStmt = this.db.prepare("\n        SELECT \n          pn.id,\n          pn.pn_number,\n          pn.principal_amount,\n          pn.interest_rate,\n          pn.issue_date,\n          c.day_basis\n        FROM promissory_notes pn\n        CROSS JOIN config c\n        WHERE pn.status = 'Active'\n          AND date(pn.issue_date) <= date(?)\n      ");
            var activePNs = pnsStmt.all(data.periodEnd);
            if (activePNs.length === 0) {
                return { success: false, error: 'No active promissory notes found for the period' };
            }
            // Begin transaction
            var insertDN = this.db.prepare("\n        INSERT INTO debit_notes (\n          dn_number, period_start, period_end, total_interest,\n          issue_date, due_date, status, created_by\n        ) VALUES (?, ?, ?, ?, date('now'), ?, 'Issued', ?)\n      ");
            var insertItem = this.db.prepare("\n        INSERT INTO debit_note_items (\n          debit_note_id, promissory_note_id, principal_amount,\n          days, rate, interest_amount\n        ) VALUES (?, ?, ?, ?, ?, ?)\n      ");
            var totalInterest = 0;
            var items = [];
            // Calculate interest for each PN
            for (var _i = 0, activePNs_1 = activePNs; _i < activePNs_1.length; _i++) {
                var pn = activePNs_1[_i];
                // Determine actual start date (issue date or period start, whichever is later)
                var actualStart = pn.issue_date > data.periodStart ? pn.issue_date : data.periodStart;
                var days = this.calculateDays(actualStart, data.periodEnd);
                if (days <= 0)
                    continue; // Skip if PN was issued after period end
                var interestAmount = this.calculateInterest(pn.principal_amount, pn.interest_rate, days, pn.day_basis);
                items.push({
                    promissoryNoteId: pn.id,
                    pnNumber: pn.pn_number,
                    principalAmount: pn.principal_amount,
                    days: days,
                    rate: pn.interest_rate,
                    interestAmount: interestAmount
                });
                totalInterest += interestAmount;
            }
            if (items.length === 0) {
                return { success: false, error: 'No interest to charge for the period' };
            }
            // Insert debit note
            var dnResult = insertDN.run(dnNumber, data.periodStart, data.periodEnd, totalInterest, data.dueDate, data.createdBy);
            var debitNoteId = dnResult.lastInsertRowid;
            // Insert line items
            for (var _a = 0, items_1 = items; _a < items_1.length; _a++) {
                var item = items_1[_a];
                insertItem.run(debitNoteId, item.promissoryNoteId, item.principalAmount, item.days, item.rate, item.interestAmount);
            }
            return {
                success: true,
                debitNoteId: debitNoteId,
                dnNumber: dnNumber
            };
        }
        catch (error) {
            console.error('Create debit note error:', error);
            return { success: false, error: 'Failed to create debit note' };
        }
    };
    DebitNoteService.prototype.updateDebitNote = function (id, data) {
        try {
            var updates = [];
            var params = [];
            if (data.status !== undefined) {
                updates.push('status = ?');
                params.push(data.status);
            }
            if (data.pdfPath !== undefined) {
                updates.push('pdf_path = ?');
                params.push(data.pdfPath);
            }
            if (updates.length === 0) {
                return { success: false, error: 'No fields to update' };
            }
            params.push(id);
            var stmt = this.db.prepare("\n        UPDATE debit_notes SET ".concat(updates.join(', '), " WHERE id = ?\n      "));
            stmt.run.apply(stmt, params);
            return { success: true };
        }
        catch (error) {
            console.error('Update debit note error:', error);
            return { success: false, error: 'Failed to update debit note' };
        }
    };
    DebitNoteService.prototype.markAsPaid = function (id) {
        return this.updateDebitNote(id, { status: 'Paid' });
    };
    DebitNoteService.prototype.updateOverdueStatus = function () {
        var today = new Date().toISOString().split('T')[0];
        var stmt = this.db.prepare("\n      UPDATE debit_notes \n      SET status = 'Overdue'\n      WHERE status = 'Issued' AND date(due_date) < date(?)\n    ");
        var result = stmt.run(today);
        return result.changes;
    };
    DebitNoteService.prototype.calculateInterest = function (principal, annualRate, days, dayBasis) {
        var interest = (principal * (annualRate / 100) * days) / dayBasis;
        return Math.round(interest * 100) / 100;
    };
    DebitNoteService.prototype.calculateDays = function (startDate, endDate) {
        var start = new Date(startDate);
        var end = new Date(endDate);
        var diff = end.getTime() - start.getTime();
        return Math.floor(diff / (1000 * 60 * 60 * 24));
    };
    return DebitNoteService;
}());
module.exports = { DebitNoteService };
