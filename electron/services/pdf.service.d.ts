export interface PromissoryNoteData {
    pnNumber: string;
    principalAmount: number;
    interestRate: number;
    issueDate: string;
    dueDate: string;
    requestNumber: string;
    assetsList?: string[];
    lender: {
        name: string;
        address: string;
        jurisdiction: string;
    };
    borrower: {
        name: string;
        address: string;
        jurisdiction: string;
    };
}
export interface WireTransferData {
    pnNumber: string;
    requestNumber: string;
    amount: number;
    beneficiary: {
        name: string;
        address: string;
    };
    assetsList?: string[];
    reference: string;
}
export interface DebitNoteData {
    dnNumber: string;
    periodStart: string;
    periodEnd: string;
    issueDate: string;
    dueDate: string;
    totalInterest: number;
    items: Array<{
        pnNumber: string;
        principalAmount: number;
        days: number;
        rate: number;
        interestAmount: number;
    }>;
    lender: {
        name: string;
        address: string;
    };
    borrower: {
        name: string;
        address: string;
    };
}
export declare class PDFService {
    private docsPath;
    constructor();
    generatePromissoryNote(data: PromissoryNoteData): Promise<string>;
    generateWireTransferOrder(data: WireTransferData): Promise<string>;
    generateDebitNote(data: DebitNoteData): Promise<string>;
    private formatMoney;
    private formatDate;
}
