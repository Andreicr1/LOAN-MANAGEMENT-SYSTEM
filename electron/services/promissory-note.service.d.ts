import { DatabaseService } from '../database/database.service';
export interface PromissoryNote {
    id: number;
    disbursementId: number;
    pnNumber: string;
    principalAmount: number;
    interestRate: number;
    issueDate: string;
    dueDate: string;
    status: 'Active' | 'Settled' | 'Overdue' | 'Cancelled';
    generatedPnPath?: string;
    signedPnPath?: string;
    settlementDate?: string;
    settlementAmount?: number;
    createdAt: string;
    updatedAt: string;
}
export declare class PromissoryNoteService {
    private db;
    constructor(dbService: DatabaseService);
    getAllPromissoryNotes(filters?: {
        status?: string;
        startDate?: string;
        endDate?: string;
    }): any[];
    getPromissoryNoteById(id: number): any | null;
    getByDisbursementId(disbursementId: number): PromissoryNote | null;
    createPromissoryNote(data: {
        disbursementId: number;
        principalAmount: number;
        interestRate: number;
        issueDate: string;
        dueDate: string;
    }): {
        success: boolean;
        promissoryNoteId?: number;
        pnNumber?: string;
        error?: string;
    };
    updatePromissoryNote(id: number, data: {
        status?: string;
        generatedPnPath?: string;
        signedPnPath?: string;
        settlementDate?: string;
        settlementAmount?: number;
    }): {
        success: boolean;
        error?: string;
    };
    settlePromissoryNote(id: number, settlementAmount: number, settlementDate: string): {
        success: boolean;
        error?: string;
    };
    updateOverdueStatus(): number;
    private mapRowToPN;
}
