import { DatabaseService } from '../database/database.service'

export interface PromissoryNote {
  id: number
  disbursementId: number
  pnNumber: string
  principalAmount: number
  interestRate: number
  issueDate: string
  dueDate: string
  status: 'Active' | 'Settled' | 'Overdue' | 'Cancelled'
  generatedPnPath?: string
  signedPnPath?: string
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
    settlementDate?: string
    settlementAmount?: number
  }): { success: boolean, error?: string } {
    try {
      const updates: string[] = []
      const params: any[] = []

      if (data.status !== undefined) {
        updates.push('status = ?')
        params.push(data.status)
      }
      if (data.generatedPnPath !== undefined) {
        updates.push('generated_pn_path = ?')
        params.push(data.generatedPnPath)
      }
      if (data.signedPnPath !== undefined) {
        updates.push('signed_pn_path = ?')
        params.push(data.signedPnPath)
      }
      if (data.settlementDate !== undefined) {
        updates.push('settlement_date = ?')
        params.push(data.settlementDate)
      }
      if (data.settlementAmount !== undefined) {
        updates.push('settlement_amount = ?')
        params.push(data.settlementAmount)
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
      principalAmount: row.principal_amount,
      interestRate: row.interest_rate,
      issueDate: row.issue_date,
      dueDate: row.due_date,
      status: row.status,
      generatedPnPath: row.generated_pn_path,
      signedPnPath: row.signed_pn_path,
      settlementDate: row.settlement_date,
      settlementAmount: row.settlement_amount,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  }
}

