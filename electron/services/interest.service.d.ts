import { DatabaseService } from '../database/database.service';
export interface InterestCalculation {
    promissoryNoteId: number;
    calculationDate: string;
    daysOutstanding: number;
    accumulatedInterest: number;
}
export declare class InterestService {
    private db;
    constructor(dbService: DatabaseService);
    calculateAllActiveInterests(): {
        success: boolean;
        calculations: number;
        error?: string;
    };
    getInterestForPromissoryNote(pnId: number, asOfDate?: string): number;
    getTotalAccumulatedInterest(): number;
    getInterestHistory(pnId: number, startDate: string, endDate: string): InterestCalculation[];
    private calculateInterest;
    private calculateDays;
}
