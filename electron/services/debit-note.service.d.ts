import { DatabaseService } from '../database/database.service';
export interface DebitNote {
    id: number;
    dnNumber: string;
    periodStart: string;
    periodEnd: string;
    totalInterest: number;
    issueDate: string;
    dueDate: string;
    status: 'Issued' | 'Paid' | 'Overdue';
    pdfPath?: string;
    createdBy: number;
    createdAt: string;
}
export interface DebitNoteItem {
    promissoryNoteId: number;
    pnNumber: string;
    principalAmount: number;
    days: number;
    rate: number;
    interestAmount: number;
}
export declare class DebitNoteService {
    private db;
    private interestService;
    constructor(dbService: DatabaseService);
    getAllDebitNotes(): DebitNote[];
    getDebitNoteById(id: number): any;
    createDebitNote(data: {
        periodStart: string;
        periodEnd: string;
        dueDate: string;
        createdBy: number;
    }): {
        success: boolean;
        debitNoteId?: number;
        dnNumber?: string;
        error?: string;
    };
    updateDebitNote(id: number, data: {
        status?: string;
        pdfPath?: string;
    }): {
        success: boolean;
        error?: string;
    };
    markAsPaid(id: number): {
        success: boolean;
        error?: string;
    };
    updateOverdueStatus(): number;
    private calculateInterest;
    private calculateDays;
}
