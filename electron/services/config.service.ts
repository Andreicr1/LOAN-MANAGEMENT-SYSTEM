import { DatabaseService } from '../database/database.service'

export interface Config {
  creditLimitTotal: number
  interestRateAnnual: number
  dayBasis: 360 | 365
  defaultDueDays: number
  pnNumberFormat: string
  lender: {
    name: string
    taxId: string
    address: string
    jurisdiction: string
  }
  borrower: {
    name: string
    taxId: string
    address: string
    jurisdiction: string
  }
  lenderSignatories?: string
  borrowerSignatories?: string
  docusignIntegrationKey?: string
  docusignAccountId?: string
  docusignBasePath?: string
  webhookUrl?: string
  webhookSecret?: string
  emailHost?: string
  emailPort?: number
  emailSecure?: number
  emailUser?: string
  emailPass?: string
  bankEmail?: string
}

export class ConfigService {
  private db

  constructor(dbService: DatabaseService) {
    this.db = dbService.getDatabase()
  }

  getConfig(): Config {
    const stmt = this.db.prepare('SELECT * FROM config WHERE id = 1')
    const row = stmt.get() as any

    return {
      creditLimitTotal: row.credit_limit_total,
      interestRateAnnual: row.interest_rate_annual,
      dayBasis: row.day_basis,
      defaultDueDays: row.default_due_days,
      pnNumberFormat: row.pn_number_format,
      lender: {
        name: row.lender_name,
        taxId: row.lender_tax_id,
        address: row.lender_address,
        jurisdiction: row.lender_jurisdiction,
      },
      borrower: {
        name: row.borrower_name,
        taxId: row.borrower_tax_id,
        address: row.borrower_address,
        jurisdiction: row.borrower_jurisdiction,
      },
    }
  }

  updateConfig(data: Partial<Config>): { success: boolean, error?: string } {
    try {
      const updates: string[] = []
      const params: any[] = []

      if (data.creditLimitTotal !== undefined) {
        updates.push('credit_limit_total = ?')
        params.push(data.creditLimitTotal)
      }
      if (data.interestRateAnnual !== undefined) {
        updates.push('interest_rate_annual = ?')
        params.push(data.interestRateAnnual)
      }
      if (data.dayBasis !== undefined) {
        updates.push('day_basis = ?')
        params.push(data.dayBasis)
      }
      if (data.defaultDueDays !== undefined) {
        updates.push('default_due_days = ?')
        params.push(data.defaultDueDays)
      }
      if (data.pnNumberFormat !== undefined) {
        updates.push('pn_number_format = ?')
        params.push(data.pnNumberFormat)
      }

      // Lender fields
      if (data.lender?.name !== undefined) {
        updates.push('lender_name = ?')
        params.push(data.lender.name)
      }
      if (data.lender?.taxId !== undefined) {
        updates.push('lender_tax_id = ?')
        params.push(data.lender.taxId)
      }
      if (data.lender?.address !== undefined) {
        updates.push('lender_address = ?')
        params.push(data.lender.address)
      }
      if (data.lender?.jurisdiction !== undefined) {
        updates.push('lender_jurisdiction = ?')
        params.push(data.lender.jurisdiction)
      }

      // Borrower fields
      if (data.borrower?.name !== undefined) {
        updates.push('borrower_name = ?')
        params.push(data.borrower.name)
      }
      if (data.borrower?.taxId !== undefined) {
        updates.push('borrower_tax_id = ?')
        params.push(data.borrower.taxId)
      }
      if (data.borrower?.address !== undefined) {
        updates.push('borrower_address = ?')
        params.push(data.borrower.address)
      }
      if (data.borrower?.jurisdiction !== undefined) {
        updates.push('borrower_jurisdiction = ?')
        params.push(data.borrower.jurisdiction)
      }

      if (updates.length === 0) {
        return { success: false, error: 'No fields to update' }
      }

      const stmt = this.db.prepare(`
        UPDATE config SET ${updates.join(', ')} WHERE id = 1
      `)
      
      stmt.run(...params)
      return { success: true }
    } catch (error: any) {
      console.error('Update config error:', error)
      return { success: false, error: 'Failed to update configuration' }
    }
  }
}

