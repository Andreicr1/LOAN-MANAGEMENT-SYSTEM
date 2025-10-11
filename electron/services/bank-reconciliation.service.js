var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
const fs = require('fs');
const { parse } = require('csv-parse');
var BankReconciliationService = /** @class */ (function () {
    function BankReconciliationService(dbService) {
        this.db = dbService.getDatabase();
    }
    BankReconciliationService.prototype.getAllTransactions = function (filters) {
        var query = "\n      SELECT \n        bt.*,\n        pn.pn_number,\n        u.full_name as matched_by_name\n      FROM bank_transactions bt\n      LEFT JOIN promissory_notes pn ON bt.promissory_note_id = pn.id\n      LEFT JOIN users u ON bt.matched_by = u.id\n      WHERE 1=1\n    ";
        var params = [];
        if ((filters === null || filters === void 0 ? void 0 : filters.matched) !== undefined) {
            query += ' AND bt.matched = ?';
            params.push(filters.matched ? 1 : 0);
        }
        if (filters === null || filters === void 0 ? void 0 : filters.startDate) {
            query += ' AND date(bt.transaction_date) >= ?';
            params.push(filters.startDate);
        }
        if (filters === null || filters === void 0 ? void 0 : filters.endDate) {
            query += ' AND date(bt.transaction_date) <= ?';
            params.push(filters.endDate);
        }
        query += ' ORDER BY bt.transaction_date DESC, bt.id DESC';
        var stmt = this.db.prepare(query);
        var rows = stmt.all.apply(stmt, params);
        return rows.map(function (row) { return ({
            id: row.id,
            promissoryNoteId: row.promissory_note_id,
            transactionDate: row.transaction_date,
            amount: row.amount,
            description: row.description,
            reference: row.reference,
            matched: Boolean(row.matched),
            matchedAt: row.matched_at,
            matchedBy: row.matched_by,
            createdAt: row.created_at,
        }); });
    };
    BankReconciliationService.prototype.importTransaction = function (transaction) {
        try {
            var stmt = this.db.prepare("\n        INSERT INTO bank_transactions (transaction_date, amount, description, reference)\n        VALUES (?, ?, ?, ?)\n      ");
            var result = stmt.run(transaction.transactionDate, transaction.amount, transaction.description || null, transaction.reference || null);
            return {
                success: true,
                transactionId: result.lastInsertRowid
            };
        }
        catch (error) {
            console.error('Import transaction error:', error);
            return { success: false, error: 'Failed to import transaction' };
        }
    };
    BankReconciliationService.prototype.importFromCSV = function (filePath) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                return [2 /*return*/, new Promise(function (resolve) {
                        var results = [];
                        var errors = [];
                        fs.createReadStream(filePath)
                            .pipe(parse({
                            columns: true,
                            skip_empty_lines: true,
                            trim: true,
                        }))
                            .on('data', function (data) {
                            results.push(data);
                        })
                            .on('error', function (err) {
                            errors.push(err.message);
                        })
                            .on('end', function () {
                            var imported = 0;
                            // DECISION: Common CSV formats - try to auto-detect columns
                            for (var _i = 0, results_1 = results; _i < results_1.length; _i++) {
                                var row = results_1[_i];
                                var date = row['Date'] || row['Transaction Date'] || row['date'];
                                var amount = row['Amount'] || row['amount'] || row['Credit'] || row['Debit'];
                                var description = row['Description'] || row['description'] || row['Memo'];
                                var reference = row['Reference'] || row['reference'] || row['Check Number'];
                                if (date && amount) {
                                    var parsedAmount = parseFloat(amount.toString().replace(/[^0-9.-]/g, ''));
                                    var result = _this.importTransaction({
                                        transactionDate: new Date(date).toISOString().split('T')[0],
                                        amount: Math.abs(parsedAmount), // Always positive
                                        description: description,
                                        reference: reference,
                                    });
                                    if (result.success) {
                                        imported++;
                                    }
                                    else {
                                        errors.push("Failed to import row: ".concat(JSON.stringify(row)));
                                    }
                                }
                            }
                            resolve({
                                success: errors.length === 0,
                                imported: imported,
                                errors: errors,
                            });
                        });
                    })];
            });
        });
    };
    BankReconciliationService.prototype.matchTransaction = function (transactionId, promissoryNoteId, userId) {
        try {
            var stmt = this.db.prepare("\n        UPDATE bank_transactions\n        SET promissory_note_id = ?,\n            matched = 1,\n            matched_at = CURRENT_TIMESTAMP,\n            matched_by = ?\n        WHERE id = ? AND matched = 0\n      ");
            var result = stmt.run(promissoryNoteId, userId, transactionId);
            if (result.changes === 0) {
                return { success: false, error: 'Transaction not found or already matched' };
            }
            // Update disbursement status to 'Disbursed' if it was 'Approved'
            this.db.prepare("\n        UPDATE disbursements\n        SET status = 'Disbursed'\n        WHERE id = (\n          SELECT disbursement_id FROM promissory_notes WHERE id = ?\n        ) AND status = 'Approved'\n      ").run(promissoryNoteId);
            return { success: true };
        }
        catch (error) {
            console.error('Match transaction error:', error);
            return { success: false, error: 'Failed to match transaction' };
        }
    };
    BankReconciliationService.prototype.unmatchTransaction = function (transactionId) {
        try {
            var stmt = this.db.prepare("\n        UPDATE bank_transactions\n        SET promissory_note_id = NULL,\n            matched = 0,\n            matched_at = NULL,\n            matched_by = NULL\n        WHERE id = ?\n      ");
            stmt.run(transactionId);
            return { success: true };
        }
        catch (error) {
            console.error('Unmatch transaction error:', error);
            return { success: false, error: 'Failed to unmatch transaction' };
        }
    };
    // DECISION: Auto-match based on amount and date proximity (± 2 days)
    BankReconciliationService.prototype.suggestMatches = function (transactionId) {
        var transaction = this.db.prepare("\n      SELECT * FROM bank_transactions WHERE id = ?\n    ").get(transactionId);
        if (!transaction)
            return [];
        var stmt = this.db.prepare("\n      SELECT \n        pn.*,\n        d.request_number,\n        ABS(julianday(?) - julianday(d.request_date)) as days_diff\n      FROM promissory_notes pn\n      INNER JOIN disbursements d ON pn.disbursement_id = d.id\n      WHERE pn.principal_amount = ?\n        AND d.status IN ('Approved', 'Disbursed')\n        AND pn.id NOT IN (\n          SELECT promissory_note_id FROM bank_transactions \n          WHERE promissory_note_id IS NOT NULL AND matched = 1\n        )\n        AND ABS(julianday(?) - julianday(d.request_date)) <= 2\n      ORDER BY days_diff ASC\n      LIMIT 5\n    ");
        return stmt.all(transaction.transaction_date, transaction.amount, transaction.transaction_date);
    };
    BankReconciliationService.prototype.getReconciliationSummary = function () {
        var stmt = this.db.prepare("\n      SELECT \n        COUNT(*) as total_transactions,\n        SUM(CASE WHEN matched = 1 THEN 1 ELSE 0 END) as matched_transactions,\n        SUM(CASE WHEN matched = 0 THEN 1 ELSE 0 END) as unmatched_transactions,\n        SUM(CASE WHEN matched = 1 THEN amount ELSE 0 END) as matched_amount,\n        SUM(CASE WHEN matched = 0 THEN amount ELSE 0 END) as unmatched_amount\n      FROM bank_transactions\n    ");
        var result = stmt.get();
        return {
            totalTransactions: result.total_transactions || 0,
            matchedTransactions: result.matched_transactions || 0,
            unmatchedTransactions: result.unmatched_transactions || 0,
            matchedAmount: result.matched_amount || 0,
            unmatchedAmount: result.unmatched_amount || 0,
        };
    };
    return BankReconciliationService;
}());
module.exports = { BankReconciliationService };
