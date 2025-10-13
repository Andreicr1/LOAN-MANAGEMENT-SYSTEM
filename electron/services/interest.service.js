"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InterestService = void 0;
class InterestService {
    constructor(dbService) {
        this.db = dbService.getDatabase();
    }
    // DECISION: Calculate daily interest for all active PNs
    calculateAllActiveInterests() {
        try {
            const today = new Date().toISOString().split('T')[0];
            // Get all active PNs
            const pnsStmt = this.db.prepare(`
        SELECT 
          pn.id, 
          pn.principal_amount, 
          pn.interest_rate, 
          pn.issue_date,
          c.day_basis
        FROM promissory_notes pn
        CROSS JOIN config c
        WHERE pn.status = 'Active'
      `);
            const activePNs = pnsStmt.all();
            let calculated = 0;
            for (const pn of activePNs) {
                const days = this.calculateDays(pn.issue_date, today);
                const interest = this.calculateInterest(pn.principal_amount, pn.interest_rate, days, pn.day_basis);
                // Upsert calculation
                const stmt = this.db.prepare(`
          INSERT INTO interest_calculations 
            (promissory_note_id, calculation_date, days_outstanding, accumulated_interest)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(promissory_note_id, calculation_date) 
          DO UPDATE SET 
            days_outstanding = excluded.days_outstanding,
            accumulated_interest = excluded.accumulated_interest
        `);
                stmt.run(pn.id, today, days, interest);
                calculated++;
            }
            return { success: true, calculations: calculated };
        }
        catch (error) {
            console.error('Calculate interests error:', error);
            return { success: false, calculations: 0, error: 'Failed to calculate interests' };
        }
    }
    getInterestForPromissoryNote(pnId, asOfDate) {
        const date = asOfDate || new Date().toISOString().split('T')[0];
        // Try to get cached calculation
        const cacheStmt = this.db.prepare(`
      SELECT accumulated_interest
      FROM interest_calculations
      WHERE promissory_note_id = ? AND calculation_date = ?
    `);
        const cached = cacheStmt.get(pnId, date);
        if (cached) {
            return cached.accumulated_interest;
        }
        // Calculate on the fly
        const pnStmt = this.db.prepare(`
      SELECT 
        pn.principal_amount, 
        pn.interest_rate, 
        pn.issue_date,
        c.day_basis
      FROM promissory_notes pn
      CROSS JOIN config c
      WHERE pn.id = ?
    `);
        const pn = pnStmt.get(pnId);
        if (!pn)
            return 0;
        const days = this.calculateDays(pn.issue_date, date);
        return this.calculateInterest(pn.principal_amount, pn.interest_rate, days, pn.day_basis);
    }
    getTotalAccumulatedInterest() {
        const today = new Date().toISOString().split('T')[0];
        const stmt = this.db.prepare(`
      SELECT SUM(accumulated_interest) as total
      FROM interest_calculations
      WHERE calculation_date = ?
      AND promissory_note_id IN (
        SELECT id FROM promissory_notes WHERE status = 'Active'
      )
    `);
        const result = stmt.get(today);
        return (result === null || result === void 0 ? void 0 : result.total) || 0;
    }
    getInterestHistory(pnId, startDate, endDate) {
        const stmt = this.db.prepare(`
      SELECT *
      FROM interest_calculations
      WHERE promissory_note_id = ?
        AND date(calculation_date) BETWEEN date(?) AND date(?)
      ORDER BY calculation_date ASC
    `);
        const rows = stmt.all(pnId, startDate, endDate);
        return rows.map(row => ({
            promissoryNoteId: row.promissory_note_id,
            calculationDate: row.calculation_date,
            daysOutstanding: row.days_outstanding,
            accumulatedInterest: row.accumulated_interest,
        }));
    }
    // DECISION: Simple interest formula
    // Interest = Principal × Rate × Days / DayBasis
    calculateInterest(principal, annualRate, days, dayBasis) {
        const interest = (principal * (annualRate / 100) * days) / dayBasis;
        return Math.round(interest * 100) / 100; // Round to 2 decimals
    }
    calculateDays(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diff = end.getTime() - start.getTime();
        return Math.floor(diff / (1000 * 60 * 60 * 24));
    }
}
exports.InterestService = InterestService;
