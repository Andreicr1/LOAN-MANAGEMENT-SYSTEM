import { DatabaseService } from '../database/database.service'
const fs = require('fs')
const path = require('path')

export interface Disbursement {
  id: number
  requestNumber: string
  clientId?: number
  clientName?: string
  requestedAmount: number
  requestDate: string
  status: 'Pending' | 'Approved' | 'Disbursed' | 'Settled' | 'Cancelled'
  assetsList?: string[]
  description?: string
  requestAttachmentPath?: string
  signedRequestPath?: string
  wireTransferPath?: string
  wire_transfer_path?: string // Snake_case alias for compatibility
  wireTransferEnvelopeId?: string
  wireTransferSignatureStatus?: string
  wireTransferSignatureDate?: string
  wireTransferSignedPath?: string
  wire_transfer_signed_path?: string // Snake_case alias for compatibility
  wireTransferSignwellDocumentId?: string
  wire_transfer_signwell_document_id?: string // Snake_case alias
  wireTransferSignwellStatus?: string
  wire_transfer_signwell_status?: string // Snake_case alias
  wireTransferSignwellEmbedUrl?: string
  wire_transfer_signwell_embed_url?: string // Snake_case alias
  bankEmailSentDate?: string
  approvedBy?: number
  approvedAt?: string
  approverName?: string
  signatories?: string
  createdBy: number
  createdAt: string
  updatedAt: string
}

export class DisbursementService {
  private db

  constructor(dbService: DatabaseService) {
    this.db = dbService.getDatabase()
  }

  getAllDisbursements(filters?: {
    status?: string
    startDate?: string
    endDate?: string
  }): Disbursement[] {
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
    `
    const params: any[] = []

    if (filters?.status) {
      query += ' AND d.status = ?'
      params.push(filters.status)
    }

    if (filters?.startDate) {
      query += ' AND date(d.request_date) >= ?'
      params.push(filters.startDate)
    }

    if (filters?.endDate) {
      query += ' AND date(d.request_date) <= ?'
      params.push(filters.endDate)
    }

    query += ' ORDER BY d.created_at DESC'

    const stmt = this.db.prepare(query)
    const rows = stmt.all(...params) as any[]

    return rows.map(row => this.mapRowToDisbursement(row))
  }

  getDisbursementById(id: number): Disbursement | null {
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
    `)
    
    const row = stmt.get(id) as any
    if (!row) return null

    return this.mapRowToDisbursement(row)
  }

  getBySignwellDocumentId(documentId: string): Disbursement | null {
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
    `)

    const row = stmt.get(documentId) as any
    if (!row) return null

    return this.mapRowToDisbursement(row)
  }

  getPendingSignwellWireTransfers(): Array<{
    id: number
    signwellDocumentId: string
    signwellStatus?: string | null
    signedPath?: string | null
    requestNumber?: string | null
  }> {
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
    `)

    const rows = stmt.all() as any[]
    return rows.map((row) => ({
      id: row.id,
      signwellDocumentId: row.wire_transfer_signwell_document_id,
      signwellStatus: row.wire_transfer_signwell_status,
      signedPath: row.wire_transfer_signed_path,
      requestNumber: row.request_number,
    }))
  }

  createDisbursement(data: {
    clientId?: number
    requestedAmount: number
    requestDate: string
    assetsList?: string[]
    description?: string
    createdBy: number
  }): { success: boolean, disbursementId?: number, requestNumber?: string, error?: string } {
    try {
      // Generate request number: REQ-YYYY-XXX
      const year = new Date().getFullYear()
      const countStmt = this.db.prepare(`
        SELECT COUNT(*) as count 
        FROM disbursements 
        WHERE request_number LIKE ?
      `)
      const count = (countStmt.get(`REQ-${year}-%`) as any).count
      const requestNumber = `REQ-${year}-${String(count + 1).padStart(3, '0')}`

      const stmt = this.db.prepare(`
        INSERT INTO disbursements (
          request_number, client_id, requested_amount, request_date, 
          assets_list, description, status, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, 'Pending', ?)
      `)

      const result = stmt.run(
        requestNumber,
        data.clientId || 1, // Default to client 1 (Whole Max) if not specified
        data.requestedAmount,
        data.requestDate,
        data.assetsList ? JSON.stringify(data.assetsList) : null,
        data.description,
        data.createdBy
      )

      return {
        success: true,
        disbursementId: result.lastInsertRowid as number,
        requestNumber
      }
    } catch (error: any) {
      console.error('Create disbursement error:', error)
      return { success: false, error: 'Failed to create disbursement' }
    }
  }

  updateDisbursement(id: number, data: {
    requestedAmount?: number
    requestDate?: string
    assetsList?: string[]
    description?: string
    status?: string
    wireTransferPath?: string
    wireTransferEnvelopeId?: string
    wireTransferSignatureStatus?: string
    wireTransferSignatureDate?: string
    wireTransferSignedPath?: string
    wireTransferSignwellDocumentId?: string
    wireTransferSignwellStatus?: string
    wireTransferSignwellEmbedUrl?: string
    bankEmailSentDate?: string
  }): { success: boolean, error?: string } {
    try {
      const updates: string[] = []
      const params: any[] = []

      if (data.requestedAmount !== undefined) {
        updates.push('requested_amount = ?')
        params.push(data.requestedAmount)
      }
      if (data.requestDate !== undefined) {
        updates.push('request_date = ?')
        params.push(data.requestDate)
      }
      if (data.assetsList !== undefined) {
        updates.push('assets_list = ?')
        params.push(JSON.stringify(data.assetsList))
      }
      if (data.description !== undefined) {
        updates.push('description = ?')
        params.push(data.description)
      }
      if (data.status !== undefined) {
        updates.push('status = ?')
        params.push(data.status)
      }
      const wireTransferPath = data.wireTransferPath ?? (data as any).wire_transfer_path
      if (wireTransferPath !== undefined) {
        updates.push('wire_transfer_path = ?')
        params.push(wireTransferPath)
      }
      if (data.wireTransferEnvelopeId !== undefined) {
        updates.push('wire_transfer_envelope_id = ?')
        params.push(data.wireTransferEnvelopeId)
      }
      if (data.wireTransferSignatureStatus !== undefined) {
        updates.push('wire_transfer_signature_status = ?')
        params.push(data.wireTransferSignatureStatus)
      }
      if (data.wireTransferSignatureDate !== undefined) {
        updates.push('wire_transfer_signature_date = ?')
        params.push(data.wireTransferSignatureDate)
      }
      const wireTransferSignedPath = data.wireTransferSignedPath ?? (data as any).wire_transfer_signed_path
      if (wireTransferSignedPath !== undefined) {
        updates.push('wire_transfer_signed_path = ?')
        params.push(wireTransferSignedPath)
      }
      const wireTransferSignwellDocumentId =
        data.wireTransferSignwellDocumentId ?? (data as any).wire_transfer_signwell_document_id
      if (wireTransferSignwellDocumentId !== undefined) {
        updates.push('wire_transfer_signwell_document_id = ?')
        params.push(wireTransferSignwellDocumentId)
      }
      const wireTransferSignwellStatus =
        data.wireTransferSignwellStatus ?? (data as any).wire_transfer_signwell_status
      if (wireTransferSignwellStatus !== undefined) {
        updates.push('wire_transfer_signwell_status = ?')
        params.push(wireTransferSignwellStatus)
      }
      const wireTransferSignwellEmbedUrl =
        data.wireTransferSignwellEmbedUrl ?? (data as any).wire_transfer_signwell_embed_url
      if (wireTransferSignwellEmbedUrl !== undefined) {
        updates.push('wire_transfer_signwell_embed_url = ?')
        params.push(wireTransferSignwellEmbedUrl)
      }
      if (data.bankEmailSentDate !== undefined) {
        updates.push('bank_email_sent_date = ?')
        params.push(data.bankEmailSentDate)
      }

      if (updates.length === 0) {
        return { success: false, error: 'No fields to update' }
      }

      params.push(id)

      const stmt = this.db.prepare(`
        UPDATE disbursements SET ${updates.join(', ')} WHERE id = ?
      `)
      
      stmt.run(...params)
      return { success: true }
    } catch (error: any) {
      console.error('Update disbursement error:', error)
      return { success: false, error: 'Failed to update disbursement' }
    }
  }

  approveDisbursement(
    id: number, 
    approvedBy: number,
    signedRequestPath?: string
  ): { success: boolean, error?: string } {
    try {
      const stmt = this.db.prepare(`
        UPDATE disbursements 
        SET status = 'Approved', 
            approved_by = ?, 
            approved_at = CURRENT_TIMESTAMP,
            signed_request_path = ?
        WHERE id = ? AND status = 'Pending'
      `)
      
      const result = stmt.run(approvedBy, signedRequestPath || null, id)
      
      if (result.changes === 0) {
        return { success: false, error: 'Disbursement not found or already processed' }
      }

      return { success: true }
    } catch (error: any) {
      console.error('Approve disbursement error:', error)
      return { success: false, error: 'Failed to approve disbursement' }
    }
  }

  uploadDocument(
    id: number, 
    fieldName: 'request_attachment' | 'signed_request',
    filePath: string
  ): { success: boolean, error?: string } {
    try {
      const field = fieldName === 'request_attachment' 
        ? 'request_attachment_path' 
        : 'signed_request_path'

      const stmt = this.db.prepare(`
        UPDATE disbursements SET ${field} = ? WHERE id = ?
      `)
      
      stmt.run(filePath, id)
      return { success: true }
    } catch (error: any) {
      console.error('Upload document error:', error)
      return { success: false, error: 'Failed to upload document' }
    }
  }

  cancelDisbursement(id: number): { success: boolean, error?: string } {
    try {
      const stmt = this.db.prepare(`
        UPDATE disbursements SET status = 'Cancelled' WHERE id = ?
      `)
      
      stmt.run(id)
      return { success: true }
    } catch (error: any) {
      console.error('Cancel disbursement error:', error)
      return { success: false, error: 'Failed to cancel disbursement' }
    }
  }

  private mapRowToDisbursement(row: any): Disbursement {
    const signatoriesJson = (() => {
      const contactEmail = row.client_contact_email as string | null | undefined
      const clientName = row.client_name as string | null | undefined
      const representativeName = row.client_representative_name as string | null | undefined
      const normalizedRepresentative =
        representativeName && representativeName.trim().length > 0
          ? representativeName.trim()
          : null
      const normalizedClientName =
        clientName && clientName.trim().length > 0 ? clientName.trim() : null

      if (contactEmail && contactEmail.trim().length > 0) {
        const primarySignatory = {
          name:
            normalizedRepresentative ||
            normalizedClientName ||
            'Authorized Representative',
          email: contactEmail.trim(),
          role: 'Primary Contact'
        }
        return JSON.stringify([primarySignatory])
      }

      if (row.client_signatories) {
        return row.client_signatories
      }

      return null
    })()

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
    }
  }
}


