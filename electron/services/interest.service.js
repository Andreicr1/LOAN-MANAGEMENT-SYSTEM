var InterestService = /** @class */ (function () {
    function InterestService(dbService) {
        this.db = dbService.getDatabase();
    }
    // DECISION: Calculate daily interest for all active PNs
    InterestService.prototype.calculateAllActiveInterests = function () {
        try {
            var today = new Date().toISOString().split('T')[0];
            // Get all active PNs
            var pnsStmt = this.db.prepare("\n        SELECT \n          pn.id, \n          pn.principal_amount, \n          pn.interest_rate, \n          pn.issue_date,\n          c.day_basis\n        FROM promissory_notes pn\n        CROSS JOIN config c\n        WHERE pn.status = 'Active'\n      ");
            var activePNs = pnsStmt.all();
            var calculated = 0;
            for (var _i = 0, activePNs_1 = activePNs; _i < activePNs_1.length; _i++) {
                var pn = activePNs_1[_i];
                var days = this.calculateDays(pn.issue_date, today);
                var interest = this.calculateInterest(pn.principal_amount, pn.interest_rate, days, pn.day_basis);
                // Upsert calculation
                var stmt = this.db.prepare("\n          INSERT INTO interest_calculations \n            (promissory_note_id, calculation_date, days_outstanding, accumulated_interest)\n          VALUES (?, ?, ?, ?)\n          ON CONFLICT(promissory_note_id, calculation_date) \n          DO UPDATE SET \n            days_outstanding = excluded.days_outstanding,\n            accumulated_interest = excluded.accumulated_interest\n        ");
                stmt.run(pn.id, today, days, interest);
                calculated++;
            }
            return { success: true, calculations: calculated };
        }
        catch (error) {
            console.error('Calculate interests error:', error);
            return { success: false, calculations: 0, error: 'Failed to calculate interests' };
        }
    };
    InterestService.prototype.getInterestForPromissoryNote = function (pnId, asOfDate) {
        var date = asOfDate || new Date().toISOString().split('T')[0];
        // Try to get cached calculation
        var cacheStmt = this.db.prepare("\n      SELECT accumulated_interest\n      FROM interest_calculations\n      WHERE promissory_note_id = ? AND calculation_date = ?\n    ");
        var cached = cacheStmt.get(pnId, date);
        if (cached) {
            return cached.accumulated_interest;
        }
        // Calculate on the fly
        var pnStmt = this.db.prepare("\n      SELECT \n        pn.principal_amount, \n        pn.interest_rate, \n        pn.issue_date,\n        c.day_basis\n      FROM promissory_notes pn\n      CROSS JOIN config c\n      WHERE pn.id = ?\n    ");
        var pn = pnStmt.get(pnId);
        if (!pn)
            return 0;
        var days = this.calculateDays(pn.issue_date, date);
        return this.calculateInterest(pn.principal_amount, pn.interest_rate, days, pn.day_basis);
    };
    InterestService.prototype.getTotalAccumulatedInterest = function () {
        var today = new Date().toISOString().split('T')[0];
        var stmt = this.db.prepare("\n      SELECT SUM(accumulated_interest) as total\n      FROM interest_calculations\n      WHERE calculation_date = ?\n      AND promissory_note_id IN (\n        SELECT id FROM promissory_notes WHERE status = 'Active'\n      )\n    ");
        var result = stmt.get(today);
        return (result === null || result === void 0 ? void 0 : result.total) || 0;
    };
    InterestService.prototype.getInterestHistory = function (pnId, startDate, endDate) {
        var stmt = this.db.prepare("\n      SELECT *\n      FROM interest_calculations\n      WHERE promissory_note_id = ?\n        AND date(calculation_date) BETWEEN date(?) AND date(?)\n      ORDER BY calculation_date ASC\n    ");
        var rows = stmt.all(pnId, startDate, endDate);
        return rows.map(function (row) { return ({
            promissoryNoteId: row.promissory_note_id,
            calculationDate: row.calculation_date,
            daysOutstanding: row.days_outstanding,
            accumulatedInterest: row.accumulated_interest,
        }); });
    };
    // DECISION: Simple interest formula
    // Interest = Principal × Rate × Days / DayBasis
    InterestService.prototype.calculateInterest = function (principal, annualRate, days, dayBasis) {
        var interest = (principal * (annualRate / 100) * days) / dayBasis;
        return Math.round(interest * 100) / 100; // Round to 2 decimals
    };
    InterestService.prototype.calculateDays = function (startDate, endDate) {
        var start = new Date(startDate);
        var end = new Date(endDate);
        var diff = end.getTime() - start.getTime();
        return Math.floor(diff / (1000 * 60 * 60 * 24));
    };
    return InterestService;
}());
export { InterestService };
