var ConfigService = /** @class */ (function () {
    function ConfigService(dbService) {
        this.db = dbService.getDatabase();
    }
    ConfigService.prototype.getConfig = function () {
        var stmt = this.db.prepare('SELECT * FROM config WHERE id = 1');
        var row = stmt.get();
        return {
            creditLimitTotal: row.credit_limit_total,
            interestRateAnnual: row.interest_rate_annual,
            dayBasis: row.day_basis,
            defaultDueDays: row.default_due_days,
            pnNumberFormat: row.pn_number_format,
            lender: {
                name: row.lender_name,
                taxId: row.lender_tax_id,
                address: row.lender_address,
                jurisdiction: row.lender_jurisdiction,
            },
            borrower: {
                name: row.borrower_name,
                taxId: row.borrower_tax_id,
                address: row.borrower_address,
                jurisdiction: row.borrower_jurisdiction,
            },
        };
    };
    ConfigService.prototype.updateConfig = function (data) {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        try {
            var updates = [];
            var params = [];
            if (data.creditLimitTotal !== undefined) {
                updates.push('credit_limit_total = ?');
                params.push(data.creditLimitTotal);
            }
            if (data.interestRateAnnual !== undefined) {
                updates.push('interest_rate_annual = ?');
                params.push(data.interestRateAnnual);
            }
            if (data.dayBasis !== undefined) {
                updates.push('day_basis = ?');
                params.push(data.dayBasis);
            }
            if (data.defaultDueDays !== undefined) {
                updates.push('default_due_days = ?');
                params.push(data.defaultDueDays);
            }
            if (data.pnNumberFormat !== undefined) {
                updates.push('pn_number_format = ?');
                params.push(data.pnNumberFormat);
            }
            // Lender fields
            if (((_a = data.lender) === null || _a === void 0 ? void 0 : _a.name) !== undefined) {
                updates.push('lender_name = ?');
                params.push(data.lender.name);
            }
            if (((_b = data.lender) === null || _b === void 0 ? void 0 : _b.taxId) !== undefined) {
                updates.push('lender_tax_id = ?');
                params.push(data.lender.taxId);
            }
            if (((_c = data.lender) === null || _c === void 0 ? void 0 : _c.address) !== undefined) {
                updates.push('lender_address = ?');
                params.push(data.lender.address);
            }
            if (((_d = data.lender) === null || _d === void 0 ? void 0 : _d.jurisdiction) !== undefined) {
                updates.push('lender_jurisdiction = ?');
                params.push(data.lender.jurisdiction);
            }
            // Borrower fields
            if (((_e = data.borrower) === null || _e === void 0 ? void 0 : _e.name) !== undefined) {
                updates.push('borrower_name = ?');
                params.push(data.borrower.name);
            }
            if (((_f = data.borrower) === null || _f === void 0 ? void 0 : _f.taxId) !== undefined) {
                updates.push('borrower_tax_id = ?');
                params.push(data.borrower.taxId);
            }
            if (((_g = data.borrower) === null || _g === void 0 ? void 0 : _g.address) !== undefined) {
                updates.push('borrower_address = ?');
                params.push(data.borrower.address);
            }
            if (((_h = data.borrower) === null || _h === void 0 ? void 0 : _h.jurisdiction) !== undefined) {
                updates.push('borrower_jurisdiction = ?');
                params.push(data.borrower.jurisdiction);
            }
            if (updates.length === 0) {
                return { success: false, error: 'No fields to update' };
            }
            var stmt = this.db.prepare("\n        UPDATE config SET ".concat(updates.join(', '), " WHERE id = 1\n      "));
            stmt.run.apply(stmt, params);
            return { success: true };
        }
        catch (error) {
            console.error('Update config error:', error);
            return { success: false, error: 'Failed to update configuration' };
        }
    };
    return ConfigService;
}());
export { ConfigService };
