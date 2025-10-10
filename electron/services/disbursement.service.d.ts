import { DatabaseService } from '../database/database.service';
export interface Disbursement {
    id: number;
    requestNumber: string;
    requestedAmount: number;
    requestDate: string;
    status: 'Pending' | 'Approved' | 'Disbursed' | 'Settled' | 'Cancelled';
    assetsList?: string[];
    description?: string;
    requestAttachmentPath?: string;
    signedRequestPath?: string;
    approvedBy?: number;
    approvedAt?: string;
    createdBy: number;
    createdAt: string;
    updatedAt: string;
}
export declare class DisbursementService {
    private db;
    constructor(dbService: DatabaseService);
    getAllDisbursements(filters?: {
        status?: string;
        startDate?: string;
        endDate?: string;
    }): Disbursement[];
    getDisbursementById(id: number): Disbursement | null;
    createDisbursement(data: {
        requestedAmount: number;
        requestDate: string;
        assetsList?: string[];
        description?: string;
        createdBy: number;
    }): {
        success: boolean;
        disbursementId?: number;
        requestNumber?: string;
        error?: string;
    };
    updateDisbursement(id: number, data: {
        requestedAmount?: number;
        requestDate?: string;
        assetsList?: string[];
        description?: string;
        status?: string;
        wireTransferPath?: string;
        wireTransferEnvelopeId?: string;
        wireTransferSignatureStatus?: string;
        wireTransferSignatureDate?: string;
        wireTransferSignedPath?: string;
        bankEmailSentDate?: string;
    }): {
        success: boolean;
        error?: string;
    };
    approveDisbursement(id: number, approvedBy: number, signedRequestPath?: string): {
        success: boolean;
        error?: string;
    };
    uploadDocument(id: number, fieldName: 'request_attachment' | 'signed_request', filePath: string): {
        success: boolean;
        error?: string;
    };
    cancelDisbursement(id: number): {
        success: boolean;
        error?: string;
    };
    private mapRowToDisbursement;
}
