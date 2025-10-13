import { DatabaseService } from '../database/database.service'

export interface PromissoryNote {
  id: number
  disbursementId: number
  pnNumber: string
  pn_number?: string // Snake_case alias for compatibility
  requestNumber?: string
  principalAmount: number
  interestRate: number
  issueDate: string
  dueDate: string
  status: 'Active' | 'Settled' | 'Overdue' | 'Cancelled'
  generatedPnPath?: string
  generated_pn_path?: string // Snake_case alias for compatibility
  signedPnPath?: string
  signed_pn_path?: string // Snake_case alias for compatibility
  signwell_document_id?: string
  signwell_status?: string
  signwell_embed_url?: string
  signwell_completed_at?: string
  envelopeId?: string
  signatureStatus?: string
  signatureDate?: string
  settlementDate?: string
  settlementAmount?: number
  createdAt: string
  updatedAt: string
}

export class PromissoryNoteService {
  private db

  constructor(dbService: DatabaseService) {
    this.db = dbService.getDatabase()
  }

  getAllPromissoryNotes(filters?: {
    status?: string
    startDate?: string
    endDate?: string
  }): any[] {
    let query = `
      SELECT 
        pn.*,
        d.request_number,
        d.requested_amount as disbursement_amount,
        d.request_date
      FROM promissory_notes pn
      INNER JOIN disbursements d ON pn.disbursement_id = d.id
      WHERE 1=1
    `
    const params: any[] = []

    if (filters?.status) {
      query += ' AND pn.status = ?'
      params.push(filters.status)
    }

    if (filters?.startDate) {
      query += ' AND date(pn.issue_date) >= ?'
      params.push(filters.startDate)
    }

    if (filters?.endDate) {
      query += ' AND date(pn.issue_date) <= ?'
      params.push(filters.endDate)
    }

    query += ' ORDER BY pn.created_at DESC'

    const stmt = this.db.prepare(query)
    return stmt.all(...params) as any[]
  }

  getPromissoryNoteById(id: number): any | null {
    const stmt = this.db.prepare(`
      SELECT 
        pn.*,
        d.request_number,
        d.requested_amount as disbursement_amount,
        d.request_date,
        d.assets_list,
        d.description
      FROM promissory_notes pn
      INNER JOIN disbursements d ON pn.disbursement_id = d.id
      WHERE pn.id = ?
    `)
    
    return stmt.get(id) as any
  }

  getByDisbursementId(disbursementId: number): PromissoryNote | null {
    const stmt = this.db.prepare(`
      SELECT * FROM promissory_notes WHERE disbursement_id = ?
    `)
    
    const row = stmt.get(disbursementId) as any
    if (!row) return null

    return this.mapRowToPN(row)
  }

  createPromissoryNote(data: {
    disbursementId: number
    principalAmount: number
    interestRate: number
    issueDate: string
    dueDate: string
  }): { success: boolean, promissoryNoteId?: number, pnNumber?: string, error?: string } {
    try {
      // Check if PN already exists for this disbursement
      const existing = this.getByDisbursementId(data.disbursementId)
      if (existing) {
        return { success: false, error: 'Promissory note already exists for this disbursement' }
      }

      // Generate PN number: PN-YYYY-XXX
      const year = new Date().getFullYear()
      const countStmt = this.db.prepare(`
        SELECT COUNT(*) as count 
        FROM promissory_notes 
        WHERE pn_number LIKE ?
      `)
      const count = (countStmt.get(`PN-${year}-%`) as any).count
      const pnNumber = `PN-${year}-${String(count + 1).padStart(3, '0')}`

      const stmt = this.db.prepare(`
        INSERT INTO promissory_notes (
          disbursement_id, pn_number, principal_amount, 
          interest_rate, issue_date, due_date, status
        ) VALUES (?, ?, ?, ?, ?, ?, 'Active')
      `)

      const result = stmt.run(
        data.disbursementId,
        pnNumber,
        data.principalAmount,
        data.interestRate,
        data.issueDate,
        data.dueDate
      )

      return {
        success: true,
        promissoryNoteId: result.lastInsertRowid as number,
        pnNumber
      }
    } catch (error: any) {
      console.error('Create promissory note error:', error)
      return { success: false, error: 'Failed to create promissory note' }
    }
  }

  updatePromissoryNote(id: number, data: {
    status?: string
    generatedPnPath?: string
    signedPnPath?: string
    signwellDocumentId?: string | null
    signwellStatus?: string | null
    signwellEmbedUrl?: string | null
    signwellCompletedAt?: string | null
    settlementDate?: string
    settlementAmount?: number
    envelopeId?: string
    signatureStatus?: string
    signatureDate?: string
  }): { success: boolean, error?: string } {
    try {
      const updates: string[] = []
      const params: any[] = []

      if (data.status !== undefined) {
        updates.push('status = ?')
        params.push(data.status)
      }
      const generatedPnPath = data.generatedPnPath ?? (data as any).generated_pn_path
      if (generatedPnPath !== undefined) {
        updates.push('generated_pn_path = ?')
        params.push(generatedPnPath)
      }
      const signedPnPath = data.signedPnPath ?? (data as any).signed_pn_path
      if (signedPnPath !== undefined) {
        updates.push('signed_pn_path = ?')
        params.push(signedPnPath)
      }
      const signwellDocumentId = (data as any).signwellDocumentId ?? (data as any).signwell_document_id
      if (signwellDocumentId !== undefined) {
        updates.push('signwell_document_id = ?')
        params.push(signwellDocumentId)
      }
      const signwellStatus = (data as any).signwellStatus ?? (data as any).signwell_status
      if (signwellStatus !== undefined) {
        updates.push('signwell_status = ?')
        params.push(signwellStatus)
      }
      const signwellEmbedUrl = (data as any).signwellEmbedUrl ?? (data as any).signwell_embed_url
      if (signwellEmbedUrl !== undefined) {
        updates.push('signwell_embed_url = ?')
        params.push(signwellEmbedUrl)
      }
      const signwellCompletedAt = (data as any).signwellCompletedAt ?? (data as any).signwell_completed_at
      if (signwellCompletedAt !== undefined) {
        updates.push('signwell_completed_at = ?')
        params.push(signwellCompletedAt)
      }
      if (data.settlementDate !== undefined) {
        updates.push('settlement_date = ?')
        params.push(data.settlementDate)
      }
      if (data.settlementAmount !== undefined) {
        updates.push('settlement_amount = ?')
        params.push(data.settlementAmount)
      }
      if (data.envelopeId !== undefined) {
        updates.push('envelope_id = ?')
        params.push(data.envelopeId)
      }
      if (data.signatureStatus !== undefined) {
        updates.push('signature_status = ?')
        params.push(data.signatureStatus)
      }
      if (data.signatureDate !== undefined) {
        updates.push('signature_date = ?')
        params.push(data.signatureDate)
      }

      if (updates.length === 0) {
        return { success: false, error: 'No fields to update' }
      }

      params.push(id)

      const stmt = this.db.prepare(`
        UPDATE promissory_notes SET ${updates.join(', ')} WHERE id = ?
      `)
      
      stmt.run(...params)
      return { success: true }
    } catch (error: any) {
      console.error('Update promissory note error:', error)
      return { success: false, error: 'Failed to update promissory note' }
    }
  }

  settlePromissoryNote(
    id: number,
    settlementAmount: number,
    settlementDate: string
  ): { success: boolean, error?: string } {
    try {
      const stmt = this.db.prepare(`
        UPDATE promissory_notes 
        SET status = 'Settled',
            settlement_date = ?,
            settlement_amount = ?
        WHERE id = ? AND status = 'Active'
      `)
      
      const result = stmt.run(settlementDate, settlementAmount, id)
      
      if (result.changes === 0) {
        return { success: false, error: 'Promissory note not found or already settled' }
      }

      // Update disbursement status
      const pn = this.getPromissoryNoteById(id)
      if (pn) {
        this.db.prepare(`
          UPDATE disbursements SET status = 'Settled' WHERE id = ?
        `).run(pn.disbursement_id)
      }

      return { success: true }
    } catch (error: any) {
      console.error('Settle promissory note error:', error)
      return { success: false, error: 'Failed to settle promissory note' }
    }
  }

  // DECISION: Check for overdue PNs and update status automatically
  updateOverdueStatus(): number {
    const today = new Date().toISOString().split('T')[0]
    
    const stmt = this.db.prepare(`
      UPDATE promissory_notes 
      SET status = 'Overdue'
      WHERE status = 'Active' AND date(due_date) < date(?)
    `)
    
    const result = stmt.run(today)
    return result.changes as number
  }

  private mapRowToPN(row: any): PromissoryNote {
    return {
      id: row.id,
      disbursementId: row.disbursement_id,
      pnNumber: row.pn_number,
      pn_number: row.pn_number, // Add snake_case for consistency
      requestNumber: row.request_number,
      principalAmount: row.principal_amount,
      interestRate: row.interest_rate,
      issueDate: row.issue_date,
      dueDate: row.due_date,
      status: row.status,
      generatedPnPath: row.generated_pn_path,
      generated_pn_path: row.generated_pn_path, // Add snake_case for consistency
      signedPnPath: row.signed_pn_path,
      signed_pn_path: row.signed_pn_path, // Add snake_case for consistency
      signwell_document_id: row.signwell_document_id,
      signwell_status: row.signwell_status,
      signwell_embed_url: row.signwell_embed_url,
      signwell_completed_at: row.signwell_completed_at,
      settlementDate: row.settlement_date,
      settlementAmount: row.settlement_amount,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  }

  getBySignwellDocumentId(documentId: string): PromissoryNote | null {
    const stmt = this.db.prepare(`
      SELECT 
        pn.*,
        d.request_number
      FROM promissory_notes pn
      LEFT JOIN disbursements d ON pn.disbursement_id = d.id
      WHERE pn.signwell_document_id = ?
    `)

    const row = stmt.get(documentId) as any
    if (!row) return null

    return this.mapRowToPN(row)
  }

  getPendingSignwellDocuments(): Array<{
    id: number
    signwellDocumentId: string
    signwellStatus?: string | null
    signedPnPath?: string | null
    pnNumber?: string | null
    requestNumber?: string | null
  }> {
    const stmt = this.db.prepare(`
      SELECT
        pn.id,
        pn.signwell_document_id,
        pn.signwell_status,
        pn.signed_pn_path,
        pn.pn_number,
        d.request_number
      FROM promissory_notes pn
      INNER JOIN disbursements d ON pn.disbursement_id = d.id
      WHERE pn.signwell_document_id IS NOT NULL
        AND (
          pn.signwell_status IS NULL OR
          pn.signwell_status NOT IN ('completed') OR
          pn.signed_pn_path IS NULL
        )
    `)

    const rows = stmt.all() as any[]
    return rows.map((row) => ({
      id: row.id,
      signwellDocumentId: row.signwell_document_id,
      signwellStatus: row.signwell_status,
      signedPnPath: row.signed_pn_path,
      pnNumber: row.pn_number,
      requestNumber: row.request_number,
    }))
  }
}

