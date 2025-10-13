"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportsService = void 0;
const interest_service_1 = require("./interest.service");
class ReportsService {
    constructor(dbService) {
        this.db = dbService.getDatabase();
        this.interestService = new interest_service_1.InterestService(dbService);
    }
    getDashboardKPIs() {
        // Sum credit limits from active clients
        const limitStmt = this.db.prepare(`
      SELECT COALESCE(SUM(credit_limit), 0) as total_limit
      FROM clients
      WHERE status = 'Active'
    `);
        const limits = limitStmt.get();
        // Get outstanding balance (sum of active PNs)
        const balanceStmt = this.db.prepare(`
      SELECT COALESCE(SUM(principal_amount), 0) as total
      FROM promissory_notes
      WHERE status IN ('Active', 'Overdue')
    `);
        const balance = balanceStmt.get();
        // Get accumulated interest
        const totalInterest = this.interestService.getTotalAccumulatedInterest();
        // Count PNs
        const countsStmt = this.db.prepare(`
      SELECT 
        COUNT(CASE WHEN status IN ('Active', 'Overdue') THEN 1 END) as active,
        COUNT(CASE WHEN status = 'Overdue' THEN 1 END) as overdue
      FROM promissory_notes
    `);
        const counts = countsStmt.get();
        const totalCreditLimit = (limits === null || limits === void 0 ? void 0 : limits.total_limit) || 0;
        const outstandingBalance = balance.total || 0;
        const availableLimit = Math.max(totalCreditLimit - outstandingBalance, 0);
        return {
            totalCreditLimit,
            outstandingBalance,
            availableLimit,
            accumulatedInterest: totalInterest,
            activePNs: counts.active || 0,
            overduePNs: counts.overdue || 0,
        };
    }
    getAgingReport() {
        const today = new Date().toISOString().split('T')[0];
        const stmt = this.db.prepare(`
      SELECT 
        pn.id,
        pn.pn_number,
        pn.principal_amount,
        pn.due_date,
        pn.status,
        CAST(julianday('${today}') - julianday(pn.due_date) AS INTEGER) as days_overdue
      FROM promissory_notes pn
      WHERE pn.status IN ('Active', 'Overdue')
    `);
        const pns = stmt.all();
        // Categorize by age
        const categories = {
            'Within Term': { count: 0, totalAmount: 0, totalInterest: 0 },
            '1-30 Days Overdue': { count: 0, totalAmount: 0, totalInterest: 0 },
            '31-60 Days Overdue': { count: 0, totalAmount: 0, totalInterest: 0 },
            '61-90 Days Overdue': { count: 0, totalAmount: 0, totalInterest: 0 },
            '> 90 Days Overdue': { count: 0, totalAmount: 0, totalInterest: 0 },
        };
        for (const pn of pns) {
            const interest = this.interestService.getInterestForPromissoryNote(pn.id);
            let category;
            if (pn.days_overdue <= 0) {
                category = 'Within Term';
            }
            else if (pn.days_overdue <= 30) {
                category = '1-30 Days Overdue';
            }
            else if (pn.days_overdue <= 60) {
                category = '31-60 Days Overdue';
            }
            else if (pn.days_overdue <= 90) {
                category = '61-90 Days Overdue';
            }
            else {
                category = '> 90 Days Overdue';
            }
            categories[category].count++;
            categories[category].totalAmount += pn.principal_amount;
            categories[category].totalInterest += interest;
        }
        return Object.entries(categories).map(([ageCategory, data]) => ({
            ageCategory,
            count: data.count,
            totalAmount: data.totalAmount,
            totalInterest: data.totalInterest,
        }));
    }
    getTimeSeriesData(startDate, endDate) {
        // Get daily outstanding balance
        const stmt = this.db.prepare(`
      SELECT 
        date(d.request_date) as date,
        SUM(pn.principal_amount) as outstanding
      FROM disbursements d
      INNER JOIN promissory_notes pn ON d.id = pn.disbursement_id
      WHERE date(d.request_date) BETWEEN date(?) AND date(?)
        AND pn.status IN ('Active', 'Overdue', 'Settled')
      GROUP BY date(d.request_date)
      ORDER BY date(d.request_date)
    `);
        return stmt.all(startDate, endDate);
    }
    getPeriodReport(startDate, endDate) {
        // Count disbursements in period
        const disbStmt = this.db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(requested_amount), 0) as total
      FROM disbursements
      WHERE date(request_date) BETWEEN date(?) AND date(?)
        AND status != 'Cancelled'
    `);
        const disb = disbStmt.get(startDate, endDate);
        // Count settlements in period
        const settleStmt = this.db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(settlement_amount), 0) as total
      FROM promissory_notes
      WHERE date(settlement_date) BETWEEN date(?) AND date(?)
    `);
        const settle = settleStmt.get(startDate, endDate);
        // Calculate interest for period
        const interestStmt = this.db.prepare(`
      SELECT COALESCE(SUM(accumulated_interest), 0) as total
      FROM interest_calculations
      WHERE date(calculation_date) BETWEEN date(?) AND date(?)
    `);
        const interest = interestStmt.get(startDate, endDate);
        // Average outstanding (simplified)
        const avgStmt = this.db.prepare(`
      SELECT AVG(principal_amount) as avg
      FROM promissory_notes
      WHERE date(issue_date) <= date(?)
        AND (date(settlement_date) >= date(?) OR settlement_date IS NULL)
    `);
        const avg = avgStmt.get(endDate, startDate);
        return {
            disbursements: disb.total || 0,
            settlements: settle.total || 0,
            interestAccrued: interest.total || 0,
            avgOutstanding: avg.avg || 0,
        };
    }
    getTopPromissoryNotes(limit = 10) {
        const stmt = this.db.prepare(`
      SELECT 
        pn.*,
        d.request_number
      FROM promissory_notes pn
      INNER JOIN disbursements d ON pn.disbursement_id = d.id
      WHERE pn.status IN ('Active', 'Overdue')
      ORDER BY pn.principal_amount DESC
      LIMIT ?
    `);
        return stmt.all(limit);
    }
    getAcquiredAssets() {
        const stmt = this.db.prepare(`
      SELECT 
        d.id as disbursement_id,
        d.request_number,
        d.requested_amount,
        d.request_date,
        d.status as disbursement_status,
        d.assets_list,
        pn.pn_number,
        pn.status as pn_status,
        pn.issue_date,
        pn.due_date
      FROM disbursements d
      LEFT JOIN promissory_notes pn ON d.id = pn.disbursement_id
      WHERE d.status IN ('Approved', 'Disbursed', 'Settled')
        AND d.assets_list IS NOT NULL
        AND d.assets_list != ''
        AND d.assets_list != '[]'
      ORDER BY d.request_date DESC
    `);
        const results = stmt.all();
        // Parse assets list and flatten
        const assetsFlat = [];
        for (const row of results) {
            try {
                const assetsList = JSON.parse(row.assets_list);
                if (Array.isArray(assetsList) && assetsList.length > 0) {
                    assetsList.forEach((asset) => {
                        assetsFlat.push({
                            asset,
                            requestNumber: row.request_number,
                            pnNumber: row.pn_number || 'N/A',
                            requestDate: row.request_date,
                            amount: row.requested_amount,
                            status: row.pn_status || row.disbursement_status,
                            issueDate: row.issue_date,
                            dueDate: row.due_date,
                        });
                    });
                }
            }
            catch (e) {
                // Skip invalid JSON
            }
        }
        return assetsFlat;
    }
}
exports.ReportsService = ReportsService;
