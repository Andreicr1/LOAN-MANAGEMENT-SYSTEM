import { DatabaseService } from '../database/database.service';
export interface BankTransaction {
    id: number;
    promissoryNoteId?: number;
    transactionDate: string;
    amount: number;
    description?: string;
    reference?: string;
    matched: boolean;
    matchedAt?: string;
    matchedBy?: number;
    createdAt: string;
}
export declare class BankReconciliationService {
    private db;
    constructor(dbService: DatabaseService);
    getAllTransactions(filters?: {
        matched?: boolean;
        startDate?: string;
        endDate?: string;
    }): BankTransaction[];
    importTransaction(transaction: {
        transactionDate: string;
        amount: number;
        description?: string;
        reference?: string;
    }): {
        success: boolean;
        transactionId?: number;
        error?: string;
    };
    importFromCSV(filePath: string): Promise<{
        success: boolean;
        imported: number;
        errors: string[];
    }>;
    matchTransaction(transactionId: number, promissoryNoteId: number, userId: number): {
        success: boolean;
        error?: string;
    };
    unmatchTransaction(transactionId: number): {
        success: boolean;
        error?: string;
    };
    suggestMatches(transactionId: number): any[];
    getReconciliationSummary(): {
        totalTransactions: number;
        matchedTransactions: number;
        unmatchedTransactions: number;
        matchedAmount: number;
        unmatchedAmount: number;
    };
}
