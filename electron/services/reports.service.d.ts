import { DatabaseService } from '../database/database.service';
export interface DashboardKPIs {
    totalCreditLimit: number;
    availableLimit: number;
    outstandingBalance: number;
    accumulatedInterest: number;
    activePNs: number;
    overduePNs: number;
}
export interface AgingReportRow {
    ageCategory: string;
    count: number;
    totalAmount: number;
    totalInterest: number;
}
export declare class ReportsService {
    private db;
    private interestService;
    constructor(dbService: DatabaseService);
    getDashboardKPIs(): DashboardKPIs;
    getAgingReport(): AgingReportRow[];
    getTimeSeriesData(startDate: string, endDate: string): any[];
    getPeriodReport(startDate: string, endDate: string): {
        disbursements: number;
        settlements: number;
        interestAccrued: number;
        avgOutstanding: number;
    };
    getTopPromissoryNotes(limit?: number): any[];
    getAcquiredAssets(): any[];
}
