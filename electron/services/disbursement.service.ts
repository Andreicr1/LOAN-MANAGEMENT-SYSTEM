import { DatabaseService } from '../database/database.service'
import fs from 'fs'
import path from 'path'

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
  wireTransferEnvelopeId?: string
  wireTransferSignatureStatus?: string
  wireTransferSignatureDate?: string
  wireTransferSignedPath?: string
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
        c.signatories as client_signatories
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
        c.signatories as client_signatories
      FROM disbursements d
      LEFT JOIN users u ON d.approved_by = u.id
      LEFT JOIN clients c ON d.client_id = c.id
      WHERE d.id = ?
    `)
    
    const row = stmt.get(id) as any
    if (!row) return null

    return this.mapRowToDisbursement(row)
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
      approvedBy: row.approved_by,
      approvedAt: row.approved_at,
      approverName: row.approver_name,
      signatories: row.client_signatories, // Use client signatories
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  }
}

