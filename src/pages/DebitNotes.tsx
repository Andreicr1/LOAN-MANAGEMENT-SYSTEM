import React, { useState, useEffect, useMemo } from 'react'
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
  const [clientFilter, setClientFilter] = useState<number | 'all' | 'unassigned'>('all')
  const [showClientList, setShowClientList] = useState(false)
  const [pnClientMap, setPnClientMap] = useState<
    Record<number, { clientId?: number; clientName: string }>
  >({})
  const [noteDetailMap, setNoteDetailMap] = useState<Record<number, any>>({})

  useEffect(() => {
    loadDebitNotes()
    // Update overdue status on mount
    window.electronAPI.debitNotes.updateOverdue()
  }, [])

  useEffect(() => {
    const loadClientMapping = async () => {
      try {
        const [disbursements, promissoryNotes] = await Promise.all([
          window.electronAPI.disbursements.getAll(),
          window.electronAPI.promissoryNotes.getAll(),
        ])

        const disbursementMap = new Map<
          number,
          { clientId?: number; clientName: string }
        >()
        disbursements.forEach((disb: any) => {
          disbursementMap.set(disb.id, {
            clientId: disb.clientId ?? undefined,
            clientName: disb.clientName || 'Unassigned',
          })
        })

        const pnMap: Record<number, { clientId?: number; clientName: string }> = {}
        promissoryNotes.forEach((pn: any) => {
          const mapping = disbursementMap.get(pn.disbursement_id)
          pnMap[pn.id] = {
            clientId: mapping?.clientId ?? undefined,
            clientName: mapping?.clientName || 'Unassigned',
          }
        })

        setPnClientMap(pnMap)
      } catch (error) {
        console.error('Failed to load client mapping for debit notes:', error)
        setPnClientMap({})
      }
    }

    loadClientMapping()
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

  useEffect(() => {
    const loadDetails = async () => {
      if (debitNotes.length === 0) {
        setNoteDetailMap({})
        return
      }

      const entries = await Promise.all(
        debitNotes.map(async (dn) => {
          try {
            const detail = await window.electronAPI.debitNotes.getById(dn.id)
            return [dn.id, detail] as const
          } catch (error) {
            console.error(`Failed to load detail for debit note ${dn.id}:`, error)
            return [dn.id, null] as const
          }
        })
      )

      const map: Record<number, any> = {}
      entries.forEach(([id, detail]) => {
        if (detail) {
          map[id] = detail
        }
      })
      setNoteDetailMap(map)
    }

    loadDetails()
  }, [debitNotes])

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

  const clientAggregates = useMemo(() => {
    if (debitNotes.length === 0) return []

    const groups = new Map<
      string,
      {
        key: string
        clientId: number | 'unassigned'
        clientName: string
        notes: Array<{
          id: number
          dnNumber: string
          periodStart: string
          periodEnd: string
          issueDate: string
          dueDate: string
          status: DebitNote['status']
          totalInterest: number
          clientInterest: number
        }>
        totalInterest: number
        statusCount: Record<string, number>
      }
    >()

    debitNotes.forEach((dn) => {
      const detail = noteDetailMap[dn.id]
      if (!detail?.items || !Array.isArray(detail.items)) return

      const interestPerClient = new Map<
        string,
        { clientId: number | 'unassigned'; clientName: string; interest: number }
      >()

      detail.items.forEach((item: any) => {
        const mapping = pnClientMap[item.promissoryNoteId] ?? {
          clientId: 'unassigned' as const,
          clientName: 'Unassigned',
        }
        const clientId = mapping.clientId ?? 'unassigned'
        const key = typeof clientId === 'number' ? clientId.toString() : clientId
        if (!interestPerClient.has(key)) {
          interestPerClient.set(key, {
            clientId,
            clientName: mapping.clientName,
            interest: 0,
          })
        }
        const entry = interestPerClient.get(key)!
        entry.interest += item.interestAmount || 0
      })

      interestPerClient.forEach((entry) => {
        if (entry.interest <= 0) return
        const key = typeof entry.clientId === 'number' ? entry.clientId.toString() : entry.clientId
        if (!groups.has(key)) {
          groups.set(key, {
            key,
            clientId: entry.clientId,
            clientName: entry.clientName,
            notes: [],
            totalInterest: 0,
            statusCount: {},
          })
        }
        const group = groups.get(key)!
        group.notes.push({
          id: dn.id,
          dnNumber: dn.dnNumber,
          periodStart: dn.periodStart,
          periodEnd: dn.periodEnd,
          issueDate: dn.issueDate,
          dueDate: dn.dueDate,
          status: dn.status,
          totalInterest: dn.totalInterest,
          clientInterest: entry.interest,
        })
        group.totalInterest += entry.interest
        group.statusCount[dn.status] = (group.statusCount[dn.status] || 0) + 1
      })
    })

    return Array.from(groups.values()).sort((a, b) =>
      a.clientName.localeCompare(b.clientName)
    )
  }, [debitNotes, noteDetailMap, pnClientMap])

  const clientOptions = useMemo(
    () =>
      clientAggregates.map((group) => ({
        id: group.clientId,
        name: group.clientName,
        count: group.notes.length,
      })),
    [clientAggregates]
  )

  const filteredGroups = useMemo(() => {
    if (clientFilter === 'all') return clientAggregates
    if (clientFilter === 'unassigned') {
      return clientAggregates.filter((group) => group.clientId === 'unassigned')
    }
    return clientAggregates.filter((group) => group.clientId === clientFilter)
  }, [clientAggregates, clientFilter])

  const portfolioTotals = useMemo(
    () =>
      filteredGroups.reduce(
        (totals, group) => {
          totals.interest += group.totalInterest
          totals.notes += group.notes.length
          return totals
        },
        { interest: 0, notes: 0 }
      ),
    [filteredGroups]
  )

  const handleSelectClient = (id: number | 'all' | 'unassigned') => {
    setClientFilter(id)
    setShowClientList(false)
  }

  useEffect(() => {
    if (clientFilter === 'all') return
    const exists = clientOptions.some((option) => option.id === clientFilter)
    if (!exists) {
      setClientFilter('all')
    }
  }, [clientOptions, clientFilter])

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
          <h1 className="text-2xl font-semibold text-text-primary tracking-tight">Debit Notes</h1>
          <p className="text-sm text-text-secondary mt-1">Monthly interest charges for promissory notes</p>
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

      {/* Client Filter */}
      <Card>
        <CardContent className="pt-5">
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant={clientFilter === 'all' ? 'secondary' : 'primary'}
              size="sm"
              onClick={() => setShowClientList((prev) => !prev)}
            >
              {clientFilter === 'all'
                ? 'Filter Clients'
                : `Client: ${
                    clientOptions.find((option) => option.id === clientFilter)?.name || 'Unassigned'
                  }`}
            </Button>
            {clientFilter !== 'all' && (
              <button
                type="button"
                onClick={() => handleSelectClient('all')}
                className="text-xs text-text-secondary underline decoration-dotted underline-offset-4"
              >
                Clear
              </button>
            )}
          </div>
          {showClientList && (
            <div className="mt-4 border-t border-border-gray pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleSelectClient('all')}
                  className={`flex items-center justify-between rounded-md border px-3 py-2 text-sm transition-colors ${
                    clientFilter === 'all'
                      ? 'border-green-primary bg-green-subtle text-green-primary'
                      : 'border-border-gray text-text-secondary hover:border-green-primary hover:bg-green-subtle/60'
                  }`}
                >
                  <span>All clients</span>
                  <span className="text-xs text-text-secondary">
                    {clientAggregates.reduce((sum, group) => sum + group.notes.length, 0)}
                  </span>
                </button>
                {clientOptions.length === 0 && (
                  <span className="px-3 py-2 text-xs text-text-secondary">
                    Client data will appear once debit note details are loaded.
                  </span>
                )}
                {clientOptions.map((option) => {
                  const isSelected = clientFilter === option.id
                  const key =
                    typeof option.id === 'number' ? option.id.toString() : option.id
                  return (
                    <button
                      key={`dn-client-filter-${key}`}
                      type="button"
                      onClick={() => handleSelectClient(option.id)}
                      className={`flex items-center justify-between rounded-md border px-3 py-2 text-sm transition-colors ${
                        isSelected
                          ? 'border-green-primary bg-green-subtle text-green-primary'
                          : 'border-border-gray text-text-secondary hover:border-green-primary hover:bg-green-subtle/60'
                      }`}
                    >
                      <span className="truncate">{option.name}</span>
                      <span className="text-xs text-text-secondary ml-2">{option.count}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Client Breakdown */}
      {loading ? (
        <Card>
          <CardContent className="pt-6 text-center text-sm text-text-secondary">
            Loading debit notes...
          </CardContent>
        </Card>
      ) : debitNotes.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-sm text-text-secondary">
            No debit notes generated yet. Generate your first debit note for interest charges.
          </CardContent>
        </Card>
      ) : Object.keys(noteDetailMap).length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-sm text-text-secondary">
            Preparing client breakdown...
          </CardContent>
        </Card>
      ) : filteredGroups.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-sm text-text-secondary">
            No debit notes match the current filters.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredGroups.map((group) => (
            <Card key={group.key}>
              <CardHeader className="flex flex-col gap-2 pb-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle className="text-base font-semibold text-text-primary">
                    {group.clientName}
                  </CardTitle>
                  <p className="text-xs text-text-secondary mt-1">
                    {group.notes.length} debit note{group.notes.length !== 1 ? 's' : ''} · Interest{' '}
                    {formatMoney(group.totalInterest)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-text-secondary">
                  {(['Issued', 'Paid', 'Overdue'] as DebitNote['status'][]).map((status) =>
                    group.statusCount[status] ? (
                      <span
                        key={`${group.key}-${status}`}
                        className="rounded-full border border-border-gray px-2 py-1"
                      >
                        {status}: {group.statusCount[status]}
                      </span>
                    ) : null
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border-gray text-xs uppercase tracking-wide text-text-secondary">
                        <th className="px-3 py-2 text-left font-semibold">Debit Note</th>
                        <th className="px-3 py-2 text-left font-semibold">Period</th>
                        <th className="px-3 py-2 text-right font-semibold">Client Interest</th>
                        <th className="px-3 py-2 text-left font-semibold">Issue Date</th>
                        <th className="px-3 py-2 text-left font-semibold">Due Date</th>
                        <th className="px-3 py-2 text-left font-semibold">Status</th>
                        <th className="px-3 py-2 text-right font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.notes.map((note) => (
                        <tr
                          key={note.id}
                          className="border-b border-border-gray/60 last:border-b-0 hover:bg-green-subtle/40"
                        >
                          <td className="px-3 py-2 text-sm font-medium text-text-primary">
                            {note.dnNumber}
                          </td>
                          <td className="px-3 py-2 text-sm text-text-secondary">
                            {formatDate(note.periodStart)} – {formatDate(note.periodEnd)}
                          </td>
                          <td className="px-3 py-2 text-sm text-right text-text-primary">
                            {formatMoney(note.clientInterest)}
                            {note.clientInterest !== note.totalInterest && (
                              <span className="block text-xs text-text-secondary">
                                of {formatMoney(note.totalInterest)}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-sm text-text-secondary">
                            {formatDate(note.issueDate)}
                          </td>
                          <td className="px-3 py-2 text-sm text-text-secondary">
                            {formatDate(note.dueDate)}
                          </td>
                          <td className="px-3 py-2 text-sm">
                            <Badge variant={getStatusBadgeVariant(note.status)}>
                              {note.status}
                            </Badge>
                          </td>
                          <td className="px-3 py-2 text-sm text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => viewDetail(note.id)}
                                className="px-2 py-1 text-xs hover:bg-blue-50 rounded text-blue-600 font-medium"
                                title="View details"
                              >
                                View
                              </button>
                              {note.status === 'Issued' && canCreate && (
                                <button
                                  onClick={() => handleMarkPaid(note.id)}
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
              </CardContent>
            </Card>
          ))}
          <div className="text-xs text-text-secondary">
            Portfolio totals — Notes {portfolioTotals.notes} · Interest {formatMoney(portfolioTotals.interest)}
          </div>
        </div>
      )}

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
