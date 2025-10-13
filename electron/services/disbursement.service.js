"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DisbursementService = void 0;
const fs = require('fs');
const path = require('path');
class DisbursementService {
    constructor(dbService) {
        this.db = dbService.getDatabase();
    }
    getAllDisbursements(filters) {
        let query = `
      SELECT 
        d.*,
        u.full_name as approver_name,
        c.name as client_name,
        c.signatories as client_signatories,
        c.contact_email as client_contact_email,
        c.representative_name as client_representative_name
      FROM disbursements d
      LEFT JOIN users u ON d.approved_by = u.id
      LEFT JOIN clients c ON d.client_id = c.id
      WHERE 1=1
    `;
        const params = [];
        if (filters === null || filters === void 0 ? void 0 : filters.status) {
            query += ' AND d.status = ?';
            params.push(filters.status);
        }
        if (filters === null || filters === void 0 ? void 0 : filters.startDate) {
            query += ' AND date(d.request_date) >= ?';
            params.push(filters.startDate);
        }
        if (filters === null || filters === void 0 ? void 0 : filters.endDate) {
            query += ' AND date(d.request_date) <= ?';
            params.push(filters.endDate);
        }
        query += ' ORDER BY d.created_at DESC';
        const stmt = this.db.prepare(query);
        const rows = stmt.all(...params);
        return rows.map(row => this.mapRowToDisbursement(row));
    }
    getDisbursementById(id) {
        const stmt = this.db.prepare(`
      SELECT 
        d.*,
        u.full_name as approver_name,
        c.name as client_name,
        c.signatories as client_signatories,
        c.contact_email as client_contact_email,
        c.representative_name as client_representative_name
      FROM disbursements d
      LEFT JOIN users u ON d.approved_by = u.id
      LEFT JOIN clients c ON d.client_id = c.id
      WHERE d.id = ?
    `);
        const row = stmt.get(id);
        if (!row)
            return null;
        return this.mapRowToDisbursement(row);
    }
    getBySignwellDocumentId(documentId) {
        const stmt = this.db.prepare(`
      SELECT 
        d.*,
        u.full_name as approver_name,
        c.name as client_name,
        c.signatories as client_signatories,
        c.contact_email as client_contact_email,
        c.representative_name as client_representative_name
      FROM disbursements d
      LEFT JOIN users u ON d.approved_by = u.id
      LEFT JOIN clients c ON d.client_id = c.id
      WHERE d.wire_transfer_signwell_document_id = ?
    `);
        const row = stmt.get(documentId);
        if (!row)
            return null;
        return this.mapRowToDisbursement(row);
    }
    getPendingSignwellWireTransfers() {
        const stmt = this.db.prepare(`
      SELECT
        d.id,
        d.request_number,
        d.wire_transfer_signwell_document_id,
        d.wire_transfer_signwell_status,
        d.wire_transfer_signed_path
      FROM disbursements d
      WHERE d.wire_transfer_signwell_document_id IS NOT NULL
        AND (
          d.wire_transfer_signwell_status IS NULL OR
          d.wire_transfer_signwell_status NOT IN ('completed') OR
          d.wire_transfer_signed_path IS NULL
        )
    `);
        const rows = stmt.all();
        return rows.map((row) => ({
            id: row.id,
            signwellDocumentId: row.wire_transfer_signwell_document_id,
            signwellStatus: row.wire_transfer_signwell_status,
            signedPath: row.wire_transfer_signed_path,
            requestNumber: row.request_number,
        }));
    }
    createDisbursement(data) {
        try {
            // Generate request number: REQ-YYYY-XXX
            const year = new Date().getFullYear();
            const countStmt = this.db.prepare(`
        SELECT COUNT(*) as count 
        FROM disbursements 
        WHERE request_number LIKE ?
      `);
            const count = countStmt.get(`REQ-${year}-%`).count;
            const requestNumber = `REQ-${year}-${String(count + 1).padStart(3, '0')}`;
            const stmt = this.db.prepare(`
        INSERT INTO disbursements (
          request_number, client_id, requested_amount, request_date, 
          assets_list, description, status, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, 'Pending', ?)
      `);
            const result = stmt.run(requestNumber, data.clientId || 1, // Default to client 1 (Whole Max) if not specified
            data.requestedAmount, data.requestDate, data.assetsList ? JSON.stringify(data.assetsList) : null, data.description, data.createdBy);
            return {
                success: true,
                disbursementId: result.lastInsertRowid,
                requestNumber
            };
        }
        catch (error) {
            console.error('Create disbursement error:', error);
            return { success: false, error: 'Failed to create disbursement' };
        }
    }
    updateDisbursement(id, data) {
        var _a, _b, _c, _d, _e;
        try {
            const updates = [];
            const params = [];
            if (data.requestedAmount !== undefined) {
                updates.push('requested_amount = ?');
                params.push(data.requestedAmount);
            }
            if (data.requestDate !== undefined) {
                updates.push('request_date = ?');
                params.push(data.requestDate);
            }
            if (data.assetsList !== undefined) {
                updates.push('assets_list = ?');
                params.push(JSON.stringify(data.assetsList));
            }
            if (data.description !== undefined) {
                updates.push('description = ?');
                params.push(data.description);
            }
            if (data.status !== undefined) {
                updates.push('status = ?');
                params.push(data.status);
            }
            const wireTransferPath = (_a = data.wireTransferPath) !== null && _a !== void 0 ? _a : data.wire_transfer_path;
            if (wireTransferPath !== undefined) {
                updates.push('wire_transfer_path = ?');
                params.push(wireTransferPath);
            }
            if (data.wireTransferEnvelopeId !== undefined) {
                updates.push('wire_transfer_envelope_id = ?');
                params.push(data.wireTransferEnvelopeId);
            }
            if (data.wireTransferSignatureStatus !== undefined) {
                updates.push('wire_transfer_signature_status = ?');
                params.push(data.wireTransferSignatureStatus);
            }
            if (data.wireTransferSignatureDate !== undefined) {
                updates.push('wire_transfer_signature_date = ?');
                params.push(data.wireTransferSignatureDate);
            }
            const wireTransferSignedPath = (_b = data.wireTransferSignedPath) !== null && _b !== void 0 ? _b : data.wire_transfer_signed_path;
            if (wireTransferSignedPath !== undefined) {
                updates.push('wire_transfer_signed_path = ?');
                params.push(wireTransferSignedPath);
            }
            const wireTransferSignwellDocumentId = (_c = data.wireTransferSignwellDocumentId) !== null && _c !== void 0 ? _c : data.wire_transfer_signwell_document_id;
            if (wireTransferSignwellDocumentId !== undefined) {
                updates.push('wire_transfer_signwell_document_id = ?');
                params.push(wireTransferSignwellDocumentId);
            }
            const wireTransferSignwellStatus = (_d = data.wireTransferSignwellStatus) !== null && _d !== void 0 ? _d : data.wire_transfer_signwell_status;
            if (wireTransferSignwellStatus !== undefined) {
                updates.push('wire_transfer_signwell_status = ?');
                params.push(wireTransferSignwellStatus);
            }
            const wireTransferSignwellEmbedUrl = (_e = data.wireTransferSignwellEmbedUrl) !== null && _e !== void 0 ? _e : data.wire_transfer_signwell_embed_url;
            if (wireTransferSignwellEmbedUrl !== undefined) {
                updates.push('wire_transfer_signwell_embed_url = ?');
                params.push(wireTransferSignwellEmbedUrl);
            }
            if (data.bankEmailSentDate !== undefined) {
                updates.push('bank_email_sent_date = ?');
                params.push(data.bankEmailSentDate);
            }
            if (updates.length === 0) {
                return { success: false, error: 'No fields to update' };
            }
            params.push(id);
            const stmt = this.db.prepare(`
        UPDATE disbursements SET ${updates.join(', ')} WHERE id = ?
      `);
            stmt.run(...params);
            return { success: true };
        }
        catch (error) {
            console.error('Update disbursement error:', error);
            return { success: false, error: 'Failed to update disbursement' };
        }
    }
    approveDisbursement(id, approvedBy, signedRequestPath) {
        try {
            const stmt = this.db.prepare(`
        UPDATE disbursements 
        SET status = 'Approved', 
            approved_by = ?, 
            approved_at = CURRENT_TIMESTAMP,
            signed_request_path = ?
        WHERE id = ? AND status = 'Pending'
      `);
            const result = stmt.run(approvedBy, signedRequestPath || null, id);
            if (result.changes === 0) {
                return { success: false, error: 'Disbursement not found or already processed' };
            }
            return { success: true };
        }
        catch (error) {
            console.error('Approve disbursement error:', error);
            return { success: false, error: 'Failed to approve disbursement' };
        }
    }
    uploadDocument(id, fieldName, filePath) {
        try {
            const field = fieldName === 'request_attachment'
                ? 'request_attachment_path'
                : 'signed_request_path';
            const stmt = this.db.prepare(`
        UPDATE disbursements SET ${field} = ? WHERE id = ?
      `);
            stmt.run(filePath, id);
            return { success: true };
        }
        catch (error) {
            console.error('Upload document error:', error);
            return { success: false, error: 'Failed to upload document' };
        }
    }
    cancelDisbursement(id) {
        try {
            const stmt = this.db.prepare(`
        UPDATE disbursements SET status = 'Cancelled' WHERE id = ?
      `);
            stmt.run(id);
            return { success: true };
        }
        catch (error) {
            console.error('Cancel disbursement error:', error);
            return { success: false, error: 'Failed to cancel disbursement' };
        }
    }
    mapRowToDisbursement(row) {
        const signatoriesJson = (() => {
            const contactEmail = row.client_contact_email;
            const clientName = row.client_name;
            const representativeName = row.client_representative_name;
            const normalizedRepresentative = representativeName && representativeName.trim().length > 0
                ? representativeName.trim()
                : null;
            const normalizedClientName = clientName && clientName.trim().length > 0 ? clientName.trim() : null;
            if (contactEmail && contactEmail.trim().length > 0) {
                const primarySignatory = {
                    name: normalizedRepresentative ||
                        normalizedClientName ||
                        'Authorized Representative',
                    email: contactEmail.trim(),
                    role: 'Primary Contact'
                };
                return JSON.stringify([primarySignatory]);
            }
            if (row.client_signatories) {
                return row.client_signatories;
            }
            return null;
        })();
        return {
            id: row.id,
            requestNumber: row.request_number,
            clientId: row.client_id,
            clientName: row.client_name,
            requestedAmount: row.requested_amount,
            requestDate: row.request_date,
            status: row.status,
            assetsList: row.assets_list ? JSON.parse(row.assets_list) : undefined,
            description: row.description,
            requestAttachmentPath: row.request_attachment_path,
            signedRequestPath: row.signed_request_path,
            wireTransferPath: row.wire_transfer_path,
            wire_transfer_path: row.wire_transfer_path, // Add snake_case for consistency
            wireTransferEnvelopeId: row.wire_transfer_envelope_id,
            wireTransferSignatureStatus: row.wire_transfer_signature_status,
            wireTransferSignatureDate: row.wire_transfer_signature_date,
            wireTransferSignedPath: row.wire_transfer_signed_path,
            wire_transfer_signed_path: row.wire_transfer_signed_path, // Add snake_case
            wireTransferSignwellDocumentId: row.wire_transfer_signwell_document_id,
            wire_transfer_signwell_document_id: row.wire_transfer_signwell_document_id, // Add snake_case
            wireTransferSignwellStatus: row.wire_transfer_signwell_status,
            wire_transfer_signwell_status: row.wire_transfer_signwell_status, // Add snake_case
            wireTransferSignwellEmbedUrl: row.wire_transfer_signwell_embed_url,
            wire_transfer_signwell_embed_url: row.wire_transfer_signwell_embed_url, // Add snake_case
            bankEmailSentDate: row.bank_email_sent_date,
            approvedBy: row.approved_by,
            approvedAt: row.approved_at,
            approverName: row.approver_name,
            signatories: signatoriesJson,
            createdBy: row.created_by,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }
}
exports.DisbursementService = DisbursementService;
