import { DatabaseService } from '../database/database.service'
import fs from 'fs'
import { parse } from 'csv-parse'

export interface BankTransaction {
  id: number
  promissoryNoteId?: number
  transactionDate: string
  amount: number
  description?: string
  reference?: string
  matched: boolean
  matchedAt?: string
  matchedBy?: number
  createdAt: string
}

export class BankReconciliationService {
  private db

  constructor(dbService: DatabaseService) {
    this.db = dbService.getDatabase()
  }

  getAllTransactions(filters?: {
    matched?: boolean
    startDate?: string
    endDate?: string
  }): BankTransaction[] {
    let query = `
      SELECT 
        bt.*,
        pn.pn_number,
        u.full_name as matched_by_name
      FROM bank_transactions bt
      LEFT JOIN promissory_notes pn ON bt.promissory_note_id = pn.id
      LEFT JOIN users u ON bt.matched_by = u.id
      WHERE 1=1
    `
    const params: any[] = []

    if (filters?.matched !== undefined) {
      query += ' AND bt.matched = ?'
      params.push(filters.matched ? 1 : 0)
    }

    if (filters?.startDate) {
      query += ' AND date(bt.transaction_date) >= ?'
      params.push(filters.startDate)
    }

    if (filters?.endDate) {
      query += ' AND date(bt.transaction_date) <= ?'
      params.push(filters.endDate)
    }

    query += ' ORDER BY bt.transaction_date DESC, bt.id DESC'

    const stmt = this.db.prepare(query)
    const rows = stmt.all(...params) as any[]

    return rows.map(row => ({
      id: row.id,
      promissoryNoteId: row.promissory_note_id,
      transactionDate: row.transaction_date,
      amount: row.amount,
      description: row.description,
      reference: row.reference,
      matched: Boolean(row.matched),
      matchedAt: row.matched_at,
      matchedBy: row.matched_by,
      createdAt: row.created_at,
    }))
  }

  importTransaction(transaction: {
    transactionDate: string
    amount: number
    description?: string
    reference?: string
  }): { success: boolean, transactionId?: number, error?: string } {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO bank_transactions (transaction_date, amount, description, reference)
        VALUES (?, ?, ?, ?)
      `)

      const result = stmt.run(
        transaction.transactionDate,
        transaction.amount,
        transaction.description || null,
        transaction.reference || null
      )

      return {
        success: true,
        transactionId: result.lastInsertRowid as number
      }
    } catch (error: any) {
      console.error('Import transaction error:', error)
      return { success: false, error: 'Failed to import transaction' }
    }
  }

  async importFromCSV(filePath: string): Promise<{
    success: boolean
    imported: number
    errors: string[]
  }> {
    return new Promise((resolve) => {
      const results: any[] = []
      const errors: string[] = []

      fs.createReadStream(filePath)
        .pipe(parse({
          columns: true,
          skip_empty_lines: true,
          trim: true,
        }))
        .on('data', (data) => {
          results.push(data)
        })
        .on('error', (err) => {
          errors.push(err.message)
        })
        .on('end', () => {
          let imported = 0

          // DECISION: Common CSV formats - try to auto-detect columns
          for (const row of results) {
            const date = row['Date'] || row['Transaction Date'] || row['date']
            const amount = row['Amount'] || row['amount'] || row['Credit'] || row['Debit']
            const description = row['Description'] || row['description'] || row['Memo']
            const reference = row['Reference'] || row['reference'] || row['Check Number']

            if (date && amount) {
              const parsedAmount = parseFloat(amount.toString().replace(/[^0-9.-]/g, ''))
              
              const result = this.importTransaction({
                transactionDate: new Date(date).toISOString().split('T')[0],
                amount: Math.abs(parsedAmount), // Always positive
                description,
                reference,
              })

              if (result.success) {
                imported++
              } else {
                errors.push(`Failed to import row: ${JSON.stringify(row)}`)
              }
            }
          }

          resolve({
            success: errors.length === 0,
            imported,
            errors,
          })
        })
    })
  }

  matchTransaction(
    transactionId: number,
    promissoryNoteId: number,
    userId: number
  ): { success: boolean, error?: string } {
    try {
      const stmt = this.db.prepare(`
        UPDATE bank_transactions
        SET promissory_note_id = ?,
            matched = 1,
            matched_at = CURRENT_TIMESTAMP,
            matched_by = ?
        WHERE id = ? AND matched = 0
      `)

      const result = stmt.run(promissoryNoteId, userId, transactionId)

      if (result.changes === 0) {
        return { success: false, error: 'Transaction not found or already matched' }
      }

      // Update disbursement status to 'Disbursed' if it was 'Approved'
      this.db.prepare(`
        UPDATE disbursements
        SET status = 'Disbursed'
        WHERE id = (
          SELECT disbursement_id FROM promissory_notes WHERE id = ?
        ) AND status = 'Approved'
      `).run(promissoryNoteId)

      return { success: true }
    } catch (error: any) {
      console.error('Match transaction error:', error)
      return { success: false, error: 'Failed to match transaction' }
    }
  }

  unmatchTransaction(transactionId: number): { success: boolean, error?: string } {
    try {
      const stmt = this.db.prepare(`
        UPDATE bank_transactions
        SET promissory_note_id = NULL,
            matched = 0,
            matched_at = NULL,
            matched_by = NULL
        WHERE id = ?
      `)

      stmt.run(transactionId)
      return { success: true }
    } catch (error: any) {
      console.error('Unmatch transaction error:', error)
      return { success: false, error: 'Failed to unmatch transaction' }
    }
  }

  // DECISION: Auto-match based on amount and date proximity (± 2 days)
  suggestMatches(transactionId: number): any[] {
    const transaction = this.db.prepare(`
      SELECT * FROM bank_transactions WHERE id = ?
    `).get(transactionId) as any

    if (!transaction) return []

    const stmt = this.db.prepare(`
      SELECT 
        pn.*,
        d.request_number,
        ABS(julianday(?) - julianday(d.request_date)) as days_diff
      FROM promissory_notes pn
      INNER JOIN disbursements d ON pn.disbursement_id = d.id
      WHERE pn.principal_amount = ?
        AND d.status IN ('Approved', 'Disbursed')
        AND pn.id NOT IN (
          SELECT promissory_note_id FROM bank_transactions 
          WHERE promissory_note_id IS NOT NULL AND matched = 1
        )
        AND ABS(julianday(?) - julianday(d.request_date)) <= 2
      ORDER BY days_diff ASC
      LIMIT 5
    `)

    return stmt.all(
      transaction.transaction_date,
      transaction.amount,
      transaction.transaction_date
    ) as any[]
  }

  getReconciliationSummary(): {
    totalTransactions: number
    matchedTransactions: number
    unmatchedTransactions: number
    matchedAmount: number
    unmatchedAmount: number
  } {
    const stmt = this.db.prepare(`
      SELECT 
        COUNT(*) as total_transactions,
        SUM(CASE WHEN matched = 1 THEN 1 ELSE 0 END) as matched_transactions,
        SUM(CASE WHEN matched = 0 THEN 1 ELSE 0 END) as unmatched_transactions,
        SUM(CASE WHEN matched = 1 THEN amount ELSE 0 END) as matched_amount,
        SUM(CASE WHEN matched = 0 THEN amount ELSE 0 END) as unmatched_amount
      FROM bank_transactions
    `)

    const result = stmt.get() as any

    return {
      totalTransactions: result.total_transactions || 0,
      matchedTransactions: result.matched_transactions || 0,
      unmatchedTransactions: result.unmatched_transactions || 0,
      matchedAmount: result.matched_amount || 0,
      unmatchedAmount: result.unmatched_amount || 0,
    }
  }
}
