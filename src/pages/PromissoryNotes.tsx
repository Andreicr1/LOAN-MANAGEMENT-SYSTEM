import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
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

interface EnrichedPromissoryNote extends PromissoryNote {
  clientId: number | 'unassigned'
  clientName: string
  accruedInterest: number
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
  const [clientFilter, setClientFilter] = useState<number | 'all' | 'unassigned'>('all')
  const [showClientList, setShowClientList] = useState(false)
  const [disbursementIndex, setDisbursementIndex] = useState<
    Record<number, { clientId?: number; clientName: string }>
  >({})

  useEffect(() => {
    loadPromissoryNotes()
    // Update overdue status on mount
    window.electronAPI.promissoryNotes.updateOverdue()
  }, [statusFilter])

  useEffect(() => {
    const loadDisbursementIndex = async () => {
      try {
        const data = await window.electronAPI.disbursements.getAll()
        const map: Record<number, { clientId?: number; clientName: string }> = {}
        data.forEach((disb: any) => {
          map[disb.id] = {
            clientId: disb.clientId ?? undefined,
            clientName: disb.clientName || 'Unassigned',
          }
        })
        setDisbursementIndex(map)
      } catch (error) {
        console.error('Failed to load disbursement client data:', error)
        setDisbursementIndex({})
      }
    }

    loadDisbursementIndex()
  }, [])

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
      await window.electronAPI.openPDF?.(pn.generated_pn_path)
    } else {
      alert('PDF not available for this Promissory Note')
    }
  }

  const canSettle = currentUser?.role === 'admin'

  const notesWithClient = useMemo<EnrichedPromissoryNote[]>(() => {
    return promissoryNotes.map((pn) => {
      const mapping = disbursementIndex[pn.disbursement_id]
      const clientId = mapping?.clientId ?? 'unassigned'
      const clientName = mapping?.clientName ?? 'Unassigned'
      return {
        ...pn,
        clientId,
        clientName,
        accruedInterest: calculateAccruedInterest(pn),
      }
    })
  }, [promissoryNotes, disbursementIndex])

  const clientOptions = useMemo(() => {
    const map = new Map<
      string,
      { id: number | 'unassigned'; name: string; count: number }
    >()
    notesWithClient.forEach((pn) => {
      const id = pn.clientId
      const key = typeof id === 'number' ? id.toString() : id
      if (!map.has(key)) {
        map.set(key, { id, name: pn.clientName, count: 1 })
      } else {
        const existing = map.get(key)!
        existing.count += 1
      }
    })
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [notesWithClient])

  const selectedClient =
    clientFilter === 'all'
      ? null
      : clientOptions.find((option) => option.id === clientFilter) ?? null

  const filteredNotes = useMemo(() => {
    if (clientFilter === 'all') return notesWithClient
    if (clientFilter === 'unassigned') {
      return notesWithClient.filter((pn) => pn.clientId === 'unassigned')
    }
    return notesWithClient.filter((pn) => pn.clientId === clientFilter)
  }, [notesWithClient, clientFilter])

  const groupedNotes = useMemo(() => {
    const groups = new Map<
      string,
      {
        key: string
        clientId: number | 'unassigned'
        clientName: string
        notes: EnrichedPromissoryNote[]
        totalPrincipal: number
        totalAccruedInterest: number
        statusCount: Record<string, number>
      }
    >()

    filteredNotes.forEach((pn) => {
      const id = pn.clientId
      const key = typeof id === 'number' ? id.toString() : id
      if (!groups.has(key)) {
        groups.set(key, {
          key,
          clientId: id,
          clientName: pn.clientName,
          notes: [],
          totalPrincipal: 0,
          totalAccruedInterest: 0,
          statusCount: {},
        })
      }
      const group = groups.get(key)!
      group.notes.push(pn)
      group.totalPrincipal += pn.principal_amount || 0
      group.totalAccruedInterest += pn.accruedInterest || 0
      group.statusCount[pn.status] = (group.statusCount[pn.status] || 0) + 1
    })

    return Array.from(groups.values()).sort((a, b) =>
      a.clientName.localeCompare(b.clientName)
    )
  }, [filteredNotes])

  const portfolioTotals = useMemo(
    () =>
      filteredNotes.reduce(
        (totals, pn) => {
          totals.principal += pn.principal_amount || 0
          totals.interest += pn.accruedInterest || 0
          return totals
        },
        { principal: 0, interest: 0 }
      ),
    [filteredNotes]
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary tracking-tight">Promissory Notes</h1>
        <p className="text-sm text-text-secondary mt-1">View and manage promissory notes</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-5">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
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
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
            <Button
              type="button"
              variant={clientFilter === 'all' ? 'secondary' : 'primary'}
              size="sm"
              onClick={() => setShowClientList((prev) => !prev)}
            >
              {clientFilter === 'all'
                ? 'Filter Clients'
                : `Client: ${selectedClient?.name || 'Unassigned'}`}
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
                  <span className="text-xs text-text-secondary">{notesWithClient.length}</span>
                </button>
                {clientOptions.length === 0 && (
                  <span className="px-3 py-2 text-xs text-text-secondary">
                    No client data available yet.
                  </span>
                )}
                {clientOptions.map((option) => {
                  const isSelected = clientFilter === option.id
                  const key =
                    typeof option.id === 'number' ? option.id.toString() : option.id
                  return (
                    <button
                      key={`pn-client-filter-${key}`}
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
            Loading promissory notes...
          </CardContent>
        </Card>
      ) : filteredNotes.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-sm text-text-secondary">
            {statusFilter === 'all' && clientFilter === 'all'
              ? 'No promissory notes found.'
              : 'No promissory notes match the current filters.'}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {groupedNotes.map((group) => (
            <Card key={group.key}>
              <CardHeader className="flex flex-col gap-2 pb-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle className="text-base font-semibold text-text-primary">
                    {group.clientName}
                  </CardTitle>
                  <p className="text-xs text-text-secondary mt-1">
                    {group.notes.length} promissory note{group.notes.length !== 1 ? 's' : ''} ·
                    Principal {formatMoney(group.totalPrincipal)} · Interest{' '}
                    {formatMoney(group.totalAccruedInterest)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-text-secondary">
                  {(
                    ['Active', 'Overdue', 'Settled', 'Cancelled'] as PromissoryNote['status'][]
                  ).map((status) =>
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
                        <th className="px-3 py-2 text-left font-semibold">PN Number</th>
                        <th className="px-3 py-2 text-right font-semibold">Principal</th>
                        <th className="px-3 py-2 text-right font-semibold">Rate</th>
                        <th className="px-3 py-2 text-left font-semibold">Issue Date</th>
                        <th className="px-3 py-2 text-left font-semibold">Due Date</th>
                        <th className="px-3 py-2 text-right font-semibold">Accrued Interest</th>
                        <th className="px-3 py-2 text-left font-semibold">Status</th>
                        <th className="px-3 py-2 text-right font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.notes.map((pn) => (
                        <tr
                          key={pn.id}
                          className="border-b border-border-gray/60 last:border-b-0 hover:bg-green-subtle/40"
                        >
                          <td className="px-3 py-2 text-sm font-medium text-text-primary">
                            {pn.pn_number}
                          </td>
                          <td className="px-3 py-2 text-sm text-right text-text-primary">
                            {formatMoney(pn.principal_amount)}
                          </td>
                          <td className="px-3 py-2 text-sm text-right text-text-secondary">
                            {pn.interest_rate}%
                          </td>
                          <td className="px-3 py-2 text-sm text-text-secondary">
                            {formatDate(pn.issue_date)}
                          </td>
                          <td className="px-3 py-2 text-sm text-text-secondary">
                            {formatDate(pn.due_date)}
                          </td>
                          <td className="px-3 py-2 text-sm text-right text-text-primary">
                            {formatMoney(pn.accruedInterest)}
                          </td>
                          <td className="px-3 py-2 text-sm">
                            <Badge variant={getStatusBadgeVariant(pn.status)}>
                              {pn.status}
                            </Badge>
                          </td>
                          <td className="px-3 py-2 text-sm text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => navigate(`/disbursements/${pn.disbursement_id}`)}
                                className="px-2 py-1 text-xs hover:bg-blue-50 rounded text-blue-600 font-medium"
                                title="View details"
                              >
                                View
                              </button>
                              {pn.generated_pn_path && (
                                <button
                                  onClick={() => openPNDocument(pn)}
                                  className="px-2 py-1 text-xs hover:bg-green-50 rounded text-green-primary font-medium"
                                  title="Open PDF"
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
              </CardContent>
            </Card>
          ))}
          <div className="text-xs text-text-secondary">
            Portfolio totals — Principal {formatMoney(portfolioTotals.principal)} · Accrued interest{' '}
            {formatMoney(portfolioTotals.interest)}
          </div>
        </div>
      )}

      {/* Settlement Modal */}
      {settlingPN && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6">
              <h3 className="text-lg font-semibold text-text-primary mb-4">Settle Promissory Note</h3>
              
              <div className="space-y-4">
                <Input
                  label="Settlement Amount (USD)"
                  numeric
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

