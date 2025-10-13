import { DatabaseService } from '../database/database.service'
import { InterestService } from './interest.service'

export interface DashboardKPIs {
  totalCreditLimit: number
  availableLimit: number
  outstandingBalance: number
  accumulatedInterest: number
  activePNs: number
  overduePNs: number
}

export type SignwellNotificationType = 'promissory_note' | 'wire_transfer'

export interface SignwellNotification {
  type: SignwellNotificationType
  id: number
  reference: string
  requestNumber?: string
  disbursementId?: number
  clientName?: string | null
  status?: string | null
  completedAt?: string | null
  attachmentPath?: string | null
  documentId: string
  updatedAt?: string | null
}

export interface AgingReportRow {
  ageCategory: string
  count: number
  totalAmount: number
  totalInterest: number
}

export class ReportsService {
  private db
  private interestService: InterestService

  constructor(dbService: DatabaseService) {
    this.db = dbService.getDatabase()
    this.interestService = new InterestService(dbService)
  }

  getDashboardKPIs(): DashboardKPIs {
    // Sum credit limits from active clients
    const limitStmt = this.db.prepare(`
      SELECT COALESCE(SUM(credit_limit), 0) as total_limit
      FROM clients
      WHERE status = 'Active'
    `)
    const limits = limitStmt.get() as any

    // Get outstanding balance (sum of active PNs)
    const balanceStmt = this.db.prepare(`
      SELECT COALESCE(SUM(principal_amount), 0) as total
      FROM promissory_notes
      WHERE status IN ('Active', 'Overdue')
    `)
    const balance = balanceStmt.get() as any

    // Get accumulated interest
    const totalInterest = this.interestService.getTotalAccumulatedInterest()

    // Count PNs
    const countsStmt = this.db.prepare(`
      SELECT 
        COUNT(CASE WHEN status IN ('Active', 'Overdue') THEN 1 END) as active,
        COUNT(CASE WHEN status = 'Overdue' THEN 1 END) as overdue
      FROM promissory_notes
    `)
    const counts = countsStmt.get() as any

    const totalCreditLimit = limits?.total_limit || 0
    const outstandingBalance = balance.total || 0
    const availableLimit = Math.max(totalCreditLimit - outstandingBalance, 0)

    return {
      totalCreditLimit,
      outstandingBalance,
      availableLimit,
      accumulatedInterest: totalInterest,
      activePNs: counts.active || 0,
      overduePNs: counts.overdue || 0,
    }
  }

  getAgingReport(): AgingReportRow[] {
    const today = new Date().toISOString().split('T')[0]

    const stmt = this.db.prepare(`
      SELECT 
        pn.id,
        pn.pn_number,
        pn.principal_amount,
        pn.due_date,
        pn.status,
        CAST(julianday('${today}') - julianday(pn.due_date) AS INTEGER) as days_overdue
      FROM promissory_notes pn
      WHERE pn.status IN ('Active', 'Overdue')
    `)

    const pns = stmt.all() as any[]

    // Categorize by age
    const categories: Record<string, { count: number; totalAmount: number; totalInterest: number }> = {
      'Within Term': { count: 0, totalAmount: 0, totalInterest: 0 },
      '1-30 Days Overdue': { count: 0, totalAmount: 0, totalInterest: 0 },
      '31-60 Days Overdue': { count: 0, totalAmount: 0, totalInterest: 0 },
      '61-90 Days Overdue': { count: 0, totalAmount: 0, totalInterest: 0 },
      '> 90 Days Overdue': { count: 0, totalAmount: 0, totalInterest: 0 },
    }

    for (const pn of pns) {
      const interest = this.interestService.getInterestForPromissoryNote(pn.id)
      let category: string

      if (pn.days_overdue <= 0) {
        category = 'Within Term'
      } else if (pn.days_overdue <= 30) {
        category = '1-30 Days Overdue'
      } else if (pn.days_overdue <= 60) {
        category = '31-60 Days Overdue'
      } else if (pn.days_overdue <= 90) {
        category = '61-90 Days Overdue'
      } else {
        category = '> 90 Days Overdue'
      }

      categories[category].count++
      categories[category].totalAmount += pn.principal_amount
      categories[category].totalInterest += interest
    }

    return Object.entries(categories).map(([ageCategory, data]) => ({
      ageCategory,
      count: data.count,
      totalAmount: data.totalAmount,
      totalInterest: data.totalInterest,
    }))
  }

  getTimeSeriesData(startDate: string, endDate: string): any[] {
    // Get daily outstanding balance
    const stmt = this.db.prepare(`
      SELECT 
        date(d.request_date) as date,
        SUM(pn.principal_amount) as outstanding
      FROM disbursements d
      INNER JOIN promissory_notes pn ON d.id = pn.disbursement_id
      WHERE date(d.request_date) BETWEEN date(?) AND date(?)
        AND pn.status IN ('Active', 'Overdue', 'Settled')
      GROUP BY date(d.request_date)
      ORDER BY date(d.request_date)
    `)

    return stmt.all(startDate, endDate) as any[]
  }

  getPeriodReport(startDate: string, endDate: string): {
    disbursements: number
    settlements: number
    interestAccrued: number
    avgOutstanding: number
  } {
    // Count disbursements in period
    const disbStmt = this.db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(requested_amount), 0) as total
      FROM disbursements
      WHERE date(request_date) BETWEEN date(?) AND date(?)
        AND status != 'Cancelled'
    `)
    const disb = disbStmt.get(startDate, endDate) as any

    // Count settlements in period
    const settleStmt = this.db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(settlement_amount), 0) as total
      FROM promissory_notes
      WHERE date(settlement_date) BETWEEN date(?) AND date(?)
    `)
    const settle = settleStmt.get(startDate, endDate) as any

    // Calculate interest for period
    const interestStmt = this.db.prepare(`
      SELECT COALESCE(SUM(accumulated_interest), 0) as total
      FROM interest_calculations
      WHERE date(calculation_date) BETWEEN date(?) AND date(?)
    `)
    const interest = interestStmt.get(startDate, endDate) as any

    // Average outstanding (simplified)
    const avgStmt = this.db.prepare(`
      SELECT AVG(principal_amount) as avg
      FROM promissory_notes
      WHERE date(issue_date) <= date(?)
        AND (date(settlement_date) >= date(?) OR settlement_date IS NULL)
    `)
    const avg = avgStmt.get(endDate, startDate) as any

    return {
      disbursements: disb.total || 0,
      settlements: settle.total || 0,
      interestAccrued: interest.total || 0,
      avgOutstanding: avg.avg || 0,
    }
  }

  getTopPromissoryNotes(limit: number = 10): any[] {
    const stmt = this.db.prepare(`
      SELECT 
        pn.*,
        d.request_number
      FROM promissory_notes pn
      INNER JOIN disbursements d ON pn.disbursement_id = d.id
      WHERE pn.status IN ('Active', 'Overdue')
      ORDER BY pn.principal_amount DESC
      LIMIT ?
    `)
    
    return stmt.all(limit) as any[]
  }

  getAcquiredAssets(): any[] {
    const stmt = this.db.prepare(`
      SELECT 
        d.id as disbursement_id,
        d.request_number,
        d.requested_amount,
        d.request_date,
        d.status as disbursement_status,
        d.assets_list,
        pn.pn_number,
        pn.status as pn_status,
        pn.issue_date,
        pn.due_date
      FROM disbursements d
      LEFT JOIN promissory_notes pn ON d.id = pn.disbursement_id
      WHERE d.status IN ('Approved', 'Disbursed', 'Settled')
        AND d.assets_list IS NOT NULL
        AND d.assets_list != ''
        AND d.assets_list != '[]'
      ORDER BY d.request_date DESC
    `)
    
    const results = stmt.all() as any[]
    
    // Parse assets list and flatten
    const assetsFlat: any[] = []
    
    for (const row of results) {
      try {
        const assetsList = JSON.parse(row.assets_list)
        if (Array.isArray(assetsList) && assetsList.length > 0) {
          assetsList.forEach((asset: string) => {
            assetsFlat.push({
              asset,
              requestNumber: row.request_number,
              pnNumber: row.pn_number || 'N/A',
              requestDate: row.request_date,
              amount: row.requested_amount,
              status: row.pn_status || row.disbursement_status,
              issueDate: row.issue_date,
              dueDate: row.due_date,
            })
          })
        }
      } catch (e) {
        // Skip invalid JSON
      }
    }
    
    return assetsFlat
  }

  getSignwellNotifications(): SignwellNotification[] {
    const pnStmt = this.db.prepare(`
      SELECT
        pn.id,
        pn.disbursement_id,
        pn.pn_number,
        pn.signwell_document_id,
        pn.signwell_status,
        pn.signwell_completed_at,
        pn.signed_pn_path,
        pn.updated_at,
        d.request_number,
        c.name as client_name
      FROM promissory_notes pn
      INNER JOIN disbursements d ON pn.disbursement_id = d.id
      LEFT JOIN clients c ON d.client_id = c.id
      WHERE pn.signwell_document_id IS NOT NULL
        AND pn.signwell_status = 'completed'
    `)

    const pnRows = pnStmt.all() as any[]

    const wtStmt = this.db.prepare(`
      SELECT
        d.id,
        d.request_number,
        d.wire_transfer_signwell_document_id,
        d.wire_transfer_signwell_status,
        d.wire_transfer_signed_path,
        d.updated_at,
        c.name as client_name
      FROM disbursements d
      LEFT JOIN clients c ON d.client_id = c.id
      WHERE d.wire_transfer_signwell_document_id IS NOT NULL
        AND d.wire_transfer_signwell_status = 'completed'
    `)

    const wtRows = wtStmt.all() as any[]

    const notifications: SignwellNotification[] = []

    for (const row of pnRows) {
      notifications.push({
        type: 'promissory_note',
        id: row.id,
        reference: row.pn_number,
        requestNumber: row.request_number,
        disbursementId: row.disbursement_id,
        clientName: row.client_name,
        status: row.signwell_status,
        completedAt: row.signwell_completed_at ?? row.updated_at,
        attachmentPath: row.signed_pn_path,
        documentId: row.signwell_document_id,
        updatedAt: row.updated_at,
      })
    }

    for (const row of wtRows) {
      notifications.push({
        type: 'wire_transfer',
        id: row.id,
        reference: row.request_number,
        requestNumber: row.request_number,
        clientName: row.client_name,
        status: row.wire_transfer_signwell_status,
        completedAt: row.updated_at,
        attachmentPath: row.wire_transfer_signed_path,
        documentId: row.wire_transfer_signwell_document_id,
        updatedAt: row.updated_at,
      })
    }

    return notifications.sort((a, b) => {
      const aDate = a.completedAt ? new Date(a.completedAt).getTime() : 0
      const bDate = b.completedAt ? new Date(b.completedAt).getTime() : 0
      return bDate - aDate
    })
  }
}

