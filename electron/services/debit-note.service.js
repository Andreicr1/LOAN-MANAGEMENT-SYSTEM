"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DebitNoteService = void 0;
const interest_service_1 = require("./interest.service");
class DebitNoteService {
    constructor(dbService) {
        this.db = dbService.getDatabase();
        this.interestService = new interest_service_1.InterestService(dbService);
    }
    getAllDebitNotes() {
        const stmt = this.db.prepare(`
      SELECT * FROM debit_notes
      ORDER BY created_at DESC
    `);
        const rows = stmt.all();
        return rows.map(row => ({
            id: row.id,
            dnNumber: row.dn_number,
            periodStart: row.period_start,
            periodEnd: row.period_end,
            totalInterest: row.total_interest,
            issueDate: row.issue_date,
            dueDate: row.due_date,
            status: row.status,
            pdfPath: row.pdf_path,
            createdBy: row.created_by,
            createdAt: row.created_at,
        }));
    }
    getDebitNoteById(id) {
        const dnStmt = this.db.prepare(`
      SELECT dn.*, u.full_name as created_by_name
      FROM debit_notes dn
      LEFT JOIN users u ON dn.created_by = u.id
      WHERE dn.id = ?
    `);
        const debitNote = dnStmt.get(id);
        if (!debitNote)
            return null;
        // Get line items
        const itemsStmt = this.db.prepare(`
      SELECT 
        dni.*,
        pn.pn_number
      FROM debit_note_items dni
      INNER JOIN promissory_notes pn ON dni.promissory_note_id = pn.id
      WHERE dni.debit_note_id = ?
      ORDER BY pn.pn_number
    `);
        const items = itemsStmt.all(id);
        return {
            ...debitNote,
            items: items.map(item => ({
                promissoryNoteId: item.promissory_note_id,
                pnNumber: item.pn_number,
                principalAmount: item.principal_amount,
                days: item.days,
                rate: item.rate,
                interestAmount: item.interest_amount,
            }))
        };
    }
    createDebitNote(data) {
        try {
            // Generate DN number: DN-YYYY-MM-XXX
            const year = new Date().getFullYear();
            const month = String(new Date().getMonth() + 1).padStart(2, '0');
            const countStmt = this.db.prepare(`
        SELECT COUNT(*) as count 
        FROM debit_notes 
        WHERE dn_number LIKE ?
      `);
            const count = countStmt.get(`DN-${year}-${month}-%`).count;
            const dnNumber = `DN-${year}-${month}-${String(count + 1).padStart(3, '0')}`;
            // Get all active PNs and calculate interest for the period
            const pnsStmt = this.db.prepare(`
        SELECT 
          pn.id,
          pn.pn_number,
          pn.principal_amount,
          pn.interest_rate,
          pn.issue_date,
          c.day_basis
        FROM promissory_notes pn
        CROSS JOIN config c
        WHERE pn.status = 'Active'
          AND date(pn.issue_date) <= date(?)
      `);
            const activePNs = pnsStmt.all(data.periodEnd);
            if (activePNs.length === 0) {
                return { success: false, error: 'No active promissory notes found for the period' };
            }
            // Begin transaction
            const insertDN = this.db.prepare(`
        INSERT INTO debit_notes (
          dn_number, period_start, period_end, total_interest,
          issue_date, due_date, status, created_by
        ) VALUES (?, ?, ?, ?, date('now'), ?, 'Issued', ?)
      `);
            const insertItem = this.db.prepare(`
        INSERT INTO debit_note_items (
          debit_note_id, promissory_note_id, principal_amount,
          days, rate, interest_amount
        ) VALUES (?, ?, ?, ?, ?, ?)
      `);
            let totalInterest = 0;
            const items = [];
            // Calculate interest for each PN
            for (const pn of activePNs) {
                // Determine actual start date (issue date or period start, whichever is later)
                const actualStart = pn.issue_date > data.periodStart ? pn.issue_date : data.periodStart;
                const days = this.calculateDays(actualStart, data.periodEnd);
                if (days <= 0)
                    continue; // Skip if PN was issued after period end
                const interestAmount = this.calculateInterest(pn.principal_amount, pn.interest_rate, days, pn.day_basis);
                items.push({
                    promissoryNoteId: pn.id,
                    pnNumber: pn.pn_number,
                    principalAmount: pn.principal_amount,
                    days,
                    rate: pn.interest_rate,
                    interestAmount
                });
                totalInterest += interestAmount;
            }
            if (items.length === 0) {
                return { success: false, error: 'No interest to charge for the period' };
            }
            // Insert debit note
            const dnResult = insertDN.run(dnNumber, data.periodStart, data.periodEnd, totalInterest, data.dueDate, data.createdBy);
            const debitNoteId = dnResult.lastInsertRowid;
            // Insert line items
            for (const item of items) {
                insertItem.run(debitNoteId, item.promissoryNoteId, item.principalAmount, item.days, item.rate, item.interestAmount);
            }
            return {
                success: true,
                debitNoteId,
                dnNumber
            };
        }
        catch (error) {
            console.error('Create debit note error:', error);
            return { success: false, error: 'Failed to create debit note' };
        }
    }
    updateDebitNote(id, data) {
        try {
            const updates = [];
            const params = [];
            if (data.status !== undefined) {
                updates.push('status = ?');
                params.push(data.status);
            }
            if (data.pdfPath !== undefined) {
                updates.push('pdf_path = ?');
                params.push(data.pdfPath);
            }
            if (updates.length === 0) {
                return { success: false, error: 'No fields to update' };
            }
            params.push(id);
            const stmt = this.db.prepare(`
        UPDATE debit_notes SET ${updates.join(', ')} WHERE id = ?
      `);
            stmt.run(...params);
            return { success: true };
        }
        catch (error) {
            console.error('Update debit note error:', error);
            return { success: false, error: 'Failed to update debit note' };
        }
    }
    markAsPaid(id) {
        return this.updateDebitNote(id, { status: 'Paid' });
    }
    updateOverdueStatus() {
        const today = new Date().toISOString().split('T')[0];
        const stmt = this.db.prepare(`
      UPDATE debit_notes 
      SET status = 'Overdue'
      WHERE status = 'Issued' AND date(due_date) < date(?)
    `);
        const result = stmt.run(today);
        return result.changes;
    }
    calculateInterest(principal, annualRate, days, dayBasis) {
        const interest = (principal * (annualRate / 100) * days) / dayBasis;
        return Math.round(interest * 100) / 100;
    }
    calculateDays(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diff = end.getTime() - start.getTime();
        return Math.floor(diff / (1000 * 60 * 60 * 24));
    }
}
exports.DebitNoteService = DebitNoteService;
