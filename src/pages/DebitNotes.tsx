import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { useAuthStore } from '@/stores/authStore'
import { formatMoney, formatDate } from '@/lib/utils'

interface DebitNote {
  id: number
  dnNumber: string
  periodStart: string
  periodEnd: string
  totalInterest: number
  issueDate: string
  dueDate: string
  status: 'Issued' | 'Paid' | 'Overdue'
  createdAt: string
}

export const DebitNotes: React.FC = () => {
  const currentUser = useAuthStore((state) => state.user)
  const [debitNotes, setDebitNotes] = useState<DebitNote[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [viewingDetail, setViewingDetail] = useState<any>(null)
  const [formData, setFormData] = useState({
    periodStart: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    periodEnd: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0],
    dueDate: '',
  })

  useEffect(() => {
    loadDebitNotes()
    // Update overdue status on mount
    window.electronAPI.debitNotes.updateOverdue()
  }, [])

  const loadDebitNotes = async () => {
    setLoading(true)
    try {
      const data = await window.electronAPI.debitNotes.getAll()
      setDebitNotes(data)
    } catch (error) {
      console.error('Failed to load debit notes:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)

    try {
      const result = await window.electronAPI.debitNotes.create({
        periodStart: formData.periodStart,
        periodEnd: formData.periodEnd,
        dueDate: formData.dueDate,
        createdBy: currentUser!.id,
      })

      if (result.success) {
        await window.electronAPI.audit.log(currentUser!.id, 'DEBIT_NOTE_CREATED', {
          dnNumber: result.dnNumber,
          periodStart: formData.periodStart,
          periodEnd: formData.periodEnd,
        })

        // Generate PDF
        await generatePDF(result.debitNoteId!)

        setShowCreate(false)
        setFormData({
          periodStart: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
          periodEnd: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0],
          dueDate: '',
        })
        loadDebitNotes()
      } else {
        alert(result.error || 'Failed to create debit note')
      }
    } catch (error) {
      alert('Failed to create debit note')
    } finally {
      setCreating(false)
    }
  }

  const generatePDF = async (dnId: number) => {
    try {
      // Get debit note details
      const dnData = await window.electronAPI.debitNotes.getById(dnId)
      if (!dnData) return

      // Get config for lender/borrower info
      const config = await window.electronAPI.config.get()

      // Generate PDF
      const pdfData = {
        dnNumber: dnData.dn_number,
        periodStart: dnData.period_start,
        periodEnd: dnData.period_end,
        issueDate: dnData.issue_date,
        dueDate: dnData.due_date,
        totalInterest: dnData.total_interest,
        items: dnData.items,
        lender: {
          name: config.lender.name,
          address: config.lender.address,
        },
        borrower: {
          name: config.borrower.name,
          address: config.borrower.address,
        },
      }

      const pdfPath = await window.electronAPI.pdf.generateDebitNote(pdfData)

      // Update debit note with PDF path
      await window.electronAPI.debitNotes.update(dnId, { pdfPath })

      await window.electronAPI.audit.log(currentUser!.id, 'DEBIT_NOTE_PDF_GENERATED', {
        dnNumber: dnData.dn_number,
      })
    } catch (error) {
      console.error('Failed to generate PDF:', error)
    }
  }

  const handleMarkPaid = async (id: number) => {
    if (!confirm('Mark this debit note as paid?')) return

    try {
      const result = await window.electronAPI.debitNotes.markPaid(id)

      if (result.success) {
        await window.electronAPI.audit.log(currentUser!.id, 'DEBIT_NOTE_MARKED_PAID', {
          debitNoteId: id,
        })
        
        loadDebitNotes()
      }
    } catch (error) {
      alert('Failed to mark as paid')
    }
  }

  const viewDetail = async (id: number) => {
    try {
      const data = await window.electronAPI.debitNotes.getById(id)
      setViewingDetail(data)
    } catch (error) {
      console.error('Failed to load detail:', error)
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    const map: any = {
      'Issued': 'approved',
      'Paid': 'settled',
      'Overdue': 'overdue',
    }
    return map[status] || 'pending'
  }

  const canCreate = currentUser?.role === 'admin' || currentUser?.role === 'operator'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Debit Notes</h1>
          <p className="text-text-secondary mt-1">Monthly interest charges for promissory notes</p>
        </div>
        {canCreate && (
          <Button onClick={() => setShowCreate(true)}>
            Generate Debit Note
          </Button>
        )}
      </div>

      {/* Current Month Info */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-secondary">
                Next period: {formatDate(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString())}
              </p>
              <p className="text-xs text-text-secondary mt-1">
                Debit notes are typically generated at the end of each month for interest accrued.
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => window.electronAPI.interest.calculateAll()}
            >
              Recalculate Interest
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Debit Notes Table */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <p className="text-center text-text-secondary py-8">Loading debit notes...</p>
          ) : debitNotes.length === 0 ? (
            <p className="text-center text-text-secondary py-8">
              No debit notes generated yet. Generate your first debit note for interest charges.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-green-subtle border-b-2 border-border-gray">
                    <th className="px-4 py-3 text-left text-sm font-semibold">DN Number</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Period</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Total Interest</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Issue Date</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Due Date</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {debitNotes.map((dn) => (
                    <tr key={dn.id} className="border-b border-border-gray hover:bg-green-subtle">
                      <td className="px-4 py-3 text-sm font-medium">{dn.dnNumber}</td>
                      <td className="px-4 py-3 text-sm">
                        {formatDate(dn.periodStart)} - {formatDate(dn.periodEnd)}
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-right">
                        {formatMoney(dn.totalInterest)}
                      </td>
                      <td className="px-4 py-3 text-sm">{formatDate(dn.issueDate)}</td>
                      <td className="px-4 py-3 text-sm">{formatDate(dn.dueDate)}</td>
                      <td className="px-4 py-3 text-sm">
                        <Badge variant={getStatusBadgeVariant(dn.status)}>
                          {dn.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => viewDetail(dn.id)}
                            className="px-2 py-1 text-xs hover:bg-blue-50 rounded text-blue-600 font-medium"
                            title="View details"
                          >
                            View
                          </button>
                          {dn.status === 'Issued' && canCreate && (
                            <button
                              onClick={() => handleMarkPaid(dn.id)}
                              className="px-2 py-1 text-xs hover:bg-green-50 rounded text-green-primary font-medium"
                              title="Mark as paid"
                            >
                              Mark Paid
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Generate Debit Note</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <p className="text-sm text-text-secondary mb-3">
                    This will generate a debit note for interest charges on all active promissory notes
                    for the specified period.
                  </p>
                </div>

                <Input
                  label="Period Start"
                  type="date"
                  value={formData.periodStart}
                  onChange={(e) => setFormData({ ...formData, periodStart: e.target.value })}
                  required
                />

                <Input
                  label="Period End"
                  type="date"
                  value={formData.periodEnd}
                  onChange={(e) => setFormData({ ...formData, periodEnd: e.target.value })}
                  required
                />

                <Input
                  label="Due Date"
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  required
                />

                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                  <span>
                    Ensure all promissory notes are properly reconciled before generating.
                  </span>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button type="submit" variant="primary" loading={creating}>
                    Generate
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowCreate(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Detail Modal */}
      {viewingDetail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-3xl max-h-[80vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{viewingDetail.dn_number} - Details</CardTitle>
                  <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => generatePDF(viewingDetail.id)}
                >
                  Download PDF
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-semibold text-text-primary">Period:</p>
                    <p className="text-sm text-text-secondary">
                      {formatDate(viewingDetail.period_start)} - {formatDate(viewingDetail.period_end)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-text-primary">Total Interest:</p>
                    <p className="text-sm text-text-secondary">
                      {formatMoney(viewingDetail.total_interest)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-text-primary">Due Date:</p>
                    <p className="text-sm text-text-secondary">
                      {formatDate(viewingDetail.due_date)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-text-primary">Status:</p>
                    <Badge variant={getStatusBadgeVariant(viewingDetail.status)}>
                      {viewingDetail.status}
                    </Badge>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-semibold text-text-primary mb-2">Interest Breakdown:</p>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50 border-b">
                          <th className="px-3 py-2 text-left text-xs font-medium">PN Number</th>
                          <th className="px-3 py-2 text-left text-xs font-medium">Principal</th>
                          <th className="px-3 py-2 text-left text-xs font-medium">Days</th>
                          <th className="px-3 py-2 text-left text-xs font-medium">Rate</th>
                          <th className="px-3 py-2 text-left text-xs font-medium">Interest</th>
                        </tr>
                      </thead>
                      <tbody>
                        {viewingDetail.items.map((item: any, index: number) => (
                          <tr key={index} className="border-b">
                            <td className="px-3 py-2 text-xs">{item.pnNumber}</td>
                            <td className="px-3 py-2 text-xs font-mono">{formatMoney(item.principalAmount)}</td>
                            <td className="px-3 py-2 text-xs">{item.days}</td>
                            <td className="px-3 py-2 text-xs">{item.rate}%</td>
                            <td className="px-3 py-2 text-xs font-mono">{formatMoney(item.interestAmount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <Button
                  variant="secondary"
                  onClick={() => setViewingDetail(null)}
                  className="w-full"
                >
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
