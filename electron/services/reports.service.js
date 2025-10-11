const { InterestService } = require('./interest.service');
var ReportsService = /** @class */ (function () {
    function ReportsService(dbService) {
        this.db = dbService.getDatabase();
        this.interestService = new InterestService(dbService);
    }
    ReportsService.prototype.getDashboardKPIs = function () {
        // Get config
        var configStmt = this.db.prepare('SELECT credit_limit_total FROM config WHERE id = 1');
        var config = configStmt.get();
        // Get outstanding balance (sum of active PNs)
        var balanceStmt = this.db.prepare("\n      SELECT COALESCE(SUM(principal_amount), 0) as total\n      FROM promissory_notes\n      WHERE status IN ('Active', 'Overdue')\n    ");
        var balance = balanceStmt.get();
        // Get accumulated interest
        var totalInterest = this.interestService.getTotalAccumulatedInterest();
        // Count PNs
        var countsStmt = this.db.prepare("\n      SELECT \n        COUNT(CASE WHEN status IN ('Active', 'Overdue') THEN 1 END) as active,\n        COUNT(CASE WHEN status = 'Overdue' THEN 1 END) as overdue\n      FROM promissory_notes\n    ");
        var counts = countsStmt.get();
        return {
            totalCreditLimit: config.credit_limit_total,
            outstandingBalance: balance.total,
            availableLimit: config.credit_limit_total - balance.total,
            accumulatedInterest: totalInterest,
            activePNs: counts.active || 0,
            overduePNs: counts.overdue || 0,
        };
    };
    ReportsService.prototype.getAgingReport = function () {
        var today = new Date().toISOString().split('T')[0];
        var stmt = this.db.prepare("\n      SELECT \n        pn.id,\n        pn.pn_number,\n        pn.principal_amount,\n        pn.due_date,\n        pn.status,\n        CAST(julianday('".concat(today, "') - julianday(pn.due_date) AS INTEGER) as days_overdue\n      FROM promissory_notes pn\n      WHERE pn.status IN ('Active', 'Overdue')\n    "));
        var pns = stmt.all();
        // Categorize by age
        var categories = {
            'Within Term': { count: 0, totalAmount: 0, totalInterest: 0 },
            '1-30 Days Overdue': { count: 0, totalAmount: 0, totalInterest: 0 },
            '31-60 Days Overdue': { count: 0, totalAmount: 0, totalInterest: 0 },
            '61-90 Days Overdue': { count: 0, totalAmount: 0, totalInterest: 0 },
            '> 90 Days Overdue': { count: 0, totalAmount: 0, totalInterest: 0 },
        };
        for (var _i = 0, pns_1 = pns; _i < pns_1.length; _i++) {
            var pn = pns_1[_i];
            var interest = this.interestService.getInterestForPromissoryNote(pn.id);
            var category = void 0;
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
        return Object.entries(categories).map(function (_a) {
            var ageCategory = _a[0], data = _a[1];
            return ({
                ageCategory: ageCategory,
                count: data.count,
                totalAmount: data.totalAmount,
                totalInterest: data.totalInterest,
            });
        });
    };
    ReportsService.prototype.getTimeSeriesData = function (startDate, endDate) {
        // Get daily outstanding balance
        var stmt = this.db.prepare("\n      SELECT \n        date(d.request_date) as date,\n        SUM(pn.principal_amount) as outstanding\n      FROM disbursements d\n      INNER JOIN promissory_notes pn ON d.id = pn.disbursement_id\n      WHERE date(d.request_date) BETWEEN date(?) AND date(?)\n        AND pn.status IN ('Active', 'Overdue', 'Settled')\n      GROUP BY date(d.request_date)\n      ORDER BY date(d.request_date)\n    ");
        return stmt.all(startDate, endDate);
    };
    ReportsService.prototype.getPeriodReport = function (startDate, endDate) {
        // Count disbursements in period
        var disbStmt = this.db.prepare("\n      SELECT COUNT(*) as count, COALESCE(SUM(requested_amount), 0) as total\n      FROM disbursements\n      WHERE date(request_date) BETWEEN date(?) AND date(?)\n        AND status != 'Cancelled'\n    ");
        var disb = disbStmt.get(startDate, endDate);
        // Count settlements in period
        var settleStmt = this.db.prepare("\n      SELECT COUNT(*) as count, COALESCE(SUM(settlement_amount), 0) as total\n      FROM promissory_notes\n      WHERE date(settlement_date) BETWEEN date(?) AND date(?)\n    ");
        var settle = settleStmt.get(startDate, endDate);
        // Calculate interest for period
        var interestStmt = this.db.prepare("\n      SELECT COALESCE(SUM(accumulated_interest), 0) as total\n      FROM interest_calculations\n      WHERE date(calculation_date) BETWEEN date(?) AND date(?)\n    ");
        var interest = interestStmt.get(startDate, endDate);
        // Average outstanding (simplified)
        var avgStmt = this.db.prepare("\n      SELECT AVG(principal_amount) as avg\n      FROM promissory_notes\n      WHERE date(issue_date) <= date(?)\n        AND (date(settlement_date) >= date(?) OR settlement_date IS NULL)\n    ");
        var avg = avgStmt.get(endDate, startDate);
        return {
            disbursements: disb.total || 0,
            settlements: settle.total || 0,
            interestAccrued: interest.total || 0,
            avgOutstanding: avg.avg || 0,
        };
    };
    ReportsService.prototype.getTopPromissoryNotes = function (limit) {
        if (limit === void 0) { limit = 10; }
        var stmt = this.db.prepare("\n      SELECT \n        pn.*,\n        d.request_number\n      FROM promissory_notes pn\n      INNER JOIN disbursements d ON pn.disbursement_id = d.id\n      WHERE pn.status IN ('Active', 'Overdue')\n      ORDER BY pn.principal_amount DESC\n      LIMIT ?\n    ");
        return stmt.all(limit);
    };
    ReportsService.prototype.getAcquiredAssets = function () {
        var stmt = this.db.prepare("\n      SELECT \n        d.id as disbursement_id,\n        d.request_number,\n        d.requested_amount,\n        d.request_date,\n        d.status as disbursement_status,\n        d.assets_list,\n        pn.pn_number,\n        pn.status as pn_status,\n        pn.issue_date,\n        pn.due_date\n      FROM disbursements d\n      LEFT JOIN promissory_notes pn ON d.id = pn.disbursement_id\n      WHERE d.status IN ('Approved', 'Disbursed', 'Settled')\n        AND d.assets_list IS NOT NULL\n        AND d.assets_list != ''\n        AND d.assets_list != '[]'\n      ORDER BY d.request_date DESC\n    ");
        var results = stmt.all();
        // Parse assets list and flatten
        var assetsFlat = [];
        var _loop_1 = function (row) {
            try {
                var assetsList = JSON.parse(row.assets_list);
                if (Array.isArray(assetsList) && assetsList.length > 0) {
                    assetsList.forEach(function (asset) {
                        assetsFlat.push({
                            asset: asset,
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
        };
        for (var _i = 0, results_1 = results; _i < results_1.length; _i++) {
            var row = results_1[_i];
            _loop_1(row);
        }
        return assetsFlat;
    };
    ReportsService.prototype.getClientPNs = function (clientId) {
        var stmt = this.db.prepare("\n      SELECT \n        pn.*,\n        d.request_number,\n        d.client_id\n      FROM promissory_notes pn\n      INNER JOIN disbursements d ON pn.disbursement_id = d.id\n      WHERE d.client_id = ?\n      ORDER BY pn.issue_date DESC\n    ");
        return stmt.all(clientId);
    };
    return ReportsService;
}());
module.exports = { ReportsService };
