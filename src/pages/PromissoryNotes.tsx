import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/stores/authStore'
import { formatMoney, formatDate } from '@/lib/utils'

interface PromissoryNote {
  id: number
  pn_number: string
  principal_amount: number
  interest_rate: number
  issue_date: string
  due_date: string
  status: string
  request_number: string
  disbursement_amount: number
  disbursement_id: number
  generated_pn_path?: string
  signed_pn_path?: string
}

export const PromissoryNotes: React.FC = () => {
  const navigate = useNavigate()
  const currentUser = useAuthStore((state) => state.user)
  const [promissoryNotes, setPromissoryNotes] = useState<PromissoryNote[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [settlingPN, setSettlingPN] = useState<number | null>(null)
  const [settlementAmount, setSettlementAmount] = useState('')
  const [settlementDate, setSettlementDate] = useState(new Date().toISOString().split('T')[0])

  useEffect(() => {
    loadPromissoryNotes()
    // Update overdue status on mount
    window.electronAPI.promissoryNotes.updateOverdue()
  }, [statusFilter])

  const loadPromissoryNotes = async () => {
    setLoading(true)
    try {
      const filters = statusFilter !== 'all' ? { status: statusFilter } : undefined
      const data = await window.electronAPI.promissoryNotes.getAll(filters)
      setPromissoryNotes(data)
    } catch (error) {
      console.error('Failed to load promissory notes:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSettle = async (pn: PromissoryNote) => {
    setSettlingPN(pn.id)
    setSettlementAmount(pn.principal_amount.toString())
  }

  const confirmSettle = async () => {
    if (!settlingPN || !settlementAmount) return

    try {
      const result = await window.electronAPI.promissoryNotes.settle(
        settlingPN,
        parseFloat(settlementAmount),
        settlementDate
      )

      if (result.success) {
        await window.electronAPI.audit.log(currentUser!.id, 'PROMISSORY_NOTE_SETTLED', {
          pnId: settlingPN,
          settlementAmount: parseFloat(settlementAmount),
        })

        setSettlingPN(null)
        setSettlementAmount('')
        loadPromissoryNotes()
      } else {
        alert(result.error)
      }
    } catch (error) {
      alert('Failed to settle promissory note')
    }
  }

  const calculateAccruedInterest = (pn: PromissoryNote): number => {
    // DECISION: Simple interest calculation for display
    const start = new Date(pn.issue_date)
    const end = pn.status === 'Settled' ? new Date() : new Date()
    const days = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    return (pn.principal_amount * pn.interest_rate / 100 * days) / 360
  }

  const getStatusBadgeVariant = (status: string) => {
    const map: any = {
      'Active': 'disbursed',
      'Settled': 'settled',
      'Overdue': 'overdue',
      'Cancelled': 'cancelled',
    }
    return map[status] || 'pending'
  }

  const openPNDocument = async (pn: PromissoryNote) => {
    if (pn.generated_pn_path) {
      await window.electronAPI.openPDF(pn.generated_pn_path)
    } else {
      alert('PDF not available for this Promissory Note')
    }
  }

  const canSettle = currentUser?.role === 'admin'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-text-primary">Promissory Notes</h1>
        <p className="text-text-secondary mt-1">View and manage promissory notes</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-text-primary">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-border-gray rounded-md focus:outline-none focus:ring-2 focus:ring-green-primary"
              aria-label="Filter by status"
            >
              <option value="all">All</option>
              <option value="Active">Active</option>
              <option value="Settled">Settled</option>
              <option value="Overdue">Overdue</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <p className="text-center text-text-secondary py-8">Loading promissory notes...</p>
          ) : promissoryNotes.length === 0 ? (
            <p className="text-center text-text-secondary py-8">
              No promissory notes found.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-green-subtle border-b-2 border-border-gray">
                    <th className="px-4 py-3 text-left text-sm font-semibold">PN Number</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Principal</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Interest Rate</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Issue Date</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Due Date</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Accrued Interest</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {promissoryNotes.map((pn) => (
                    <tr key={pn.id} className="border-b border-border-gray hover:bg-green-subtle">
                      <td className="px-4 py-3 text-sm font-medium">{pn.pn_number}</td>
                      <td className="px-4 py-3 text-sm font-mono text-right">
                        {formatMoney(pn.principal_amount)}
                      </td>
                      <td className="px-4 py-3 text-sm">{pn.interest_rate}%</td>
                      <td className="px-4 py-3 text-sm">{formatDate(pn.issue_date)}</td>
                      <td className="px-4 py-3 text-sm">{formatDate(pn.due_date)}</td>
                      <td className="px-4 py-3 text-sm font-mono text-right">
                        {formatMoney(calculateAccruedInterest(pn))}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <Badge variant={getStatusBadgeVariant(pn.status)}>
                          {pn.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => navigate(`/disbursements/${pn.disbursement_id}`)}
                            className="px-2 py-1 text-xs hover:bg-blue-50 rounded text-blue-600 font-medium"
                            title="View Details"
                          >
                            View
                          </button>
                          {pn.generated_pn_path && (
                            <button
                              onClick={() => openPNDocument(pn)}
                              className="px-2 py-1 text-xs hover:bg-green-50 rounded text-green-primary font-medium"
                              title="View PDF"
                            >
                              PDF
                            </button>
                          )}
                          {canSettle && pn.status === 'Active' && (
                            <button
                              onClick={() => handleSettle(pn)}
                              className="px-2 py-1 text-xs hover:bg-green-50 rounded text-green-primary font-medium"
                              title="Settle"
                            >
                              Settle
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

      {/* Settlement Modal */}
      {settlingPN && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6">
              <h3 className="text-lg font-semibold text-text-primary mb-4">Settle Promissory Note</h3>
              
              <div className="space-y-4">
                <Input
                  label="Settlement Amount (USD)"
                  type="number"
                  step="0.01"
                  value={settlementAmount}
                  onChange={(e) => setSettlementAmount(e.target.value)}
                  required
                />

                <Input
                  label="Settlement Date"
                  type="date"
                  value={settlementDate}
                  onChange={(e) => setSettlementDate(e.target.value)}
                  required
                />

                <div className="flex gap-3 pt-4">
                  <Button onClick={confirmSettle} variant="primary">
                    Confirm Settlement
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setSettlingPN(null)
                      setSettlementAmount('')
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

