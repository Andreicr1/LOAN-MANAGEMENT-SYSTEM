import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useAuthStore } from '@/stores/authStore'
import { formatMoney, formatDate } from '@/lib/utils'

interface Disbursement {
  id: number
  requestNumber: string
  clientId?: number
  clientName?: string
  requestedAmount: number
  requestDate: string
  status: 'Pending' | 'Approved' | 'Disbursed' | 'Settled' | 'Cancelled'
  description?: string
  approverName?: string
  approvedAt?: string
  createdAt: string
}

export const Disbursements: React.FC = () => {
  const navigate = useNavigate()
  const currentUser = useAuthStore((state) => state.user)
  const [disbursements, setDisbursements] = useState<Disbursement[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [clientFilter, setClientFilter] = useState<number | 'all' | 'unassigned'>('all')
  const [showClientList, setShowClientList] = useState(false)

  useEffect(() => {
    loadDisbursements()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter])

  const loadDisbursements = async () => {
    setLoading(true)
    try {
      const filters = statusFilter !== 'all' ? { status: statusFilter } : undefined
      const data = await window.electronAPI.disbursements.getAll(filters)
      setDisbursements(data)
    } catch (error) {
      console.error('Failed to load disbursements:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (id: number) => {
    if (!confirm('Approve this disbursement request?')) return

    try {
      const result = await window.electronAPI.disbursements.approve(id, currentUser!.id)
      
      if (result.success) {
        await window.electronAPI.audit.log(currentUser!.id, 'DISBURSEMENT_APPROVED', { disbursementId: id })
        loadDisbursements()
      } else {
        alert(result.error || 'Failed to approve')
      }
    } catch (error) {
      alert('An error occurred')
    }
  }

  const handleCancel = async (id: number) => {
    if (!confirm('Cancel this disbursement request?')) return

    try {
      const result = await window.electronAPI.disbursements.cancel(id)
      
      if (result.success) {
        await window.electronAPI.audit.log(currentUser!.id, 'DISBURSEMENT_CANCELLED', { disbursementId: id })
        loadDisbursements()
      }
    } catch (error) {
      alert('An error occurred')
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    const map: any = {
      'Pending': 'pending',
      'Approved': 'approved',
      'Disbursed': 'disbursed',
      'Settled': 'settled',
      'Cancelled': 'cancelled'
    }
    return map[status] || 'pending'
  }

  const canApprove = currentUser?.role === 'admin'

  const clientOptions = useMemo(() => {
    const map = new Map<
      string,
      { id: number | 'unassigned'; name: string; count: number }
    >()
    disbursements.forEach((disb) => {
      const id = disb.clientId ?? 'unassigned'
      const key = typeof id === 'number' ? id.toString() : id
      const name = disb.clientName || 'Unassigned'
      if (!map.has(key)) {
        map.set(key, { id, name, count: 1 })
      } else {
        const existing = map.get(key)!
        existing.count += 1
      }
    })
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [disbursements])

  const selectedClient =
    clientFilter === 'all'
      ? null
      : clientOptions.find((option) => option.id === clientFilter) ?? null

  const filteredDisbursements = useMemo(() => {
    if (clientFilter === 'all') return disbursements
    if (clientFilter === 'unassigned') {
      return disbursements.filter((disb) => !disb.clientId)
    }
    return disbursements.filter((disb) => disb.clientId === clientFilter)
  }, [disbursements, clientFilter])

  const groupedDisbursements = useMemo(() => {
    const groups = new Map<
      string,
      {
        key: string
        clientId: number | 'unassigned'
        clientName: string
        disbursementList: Disbursement[]
        totalAmount: number
        statusCount: Record<string, number>
      }
    >()

    filteredDisbursements.forEach((disb) => {
      const id = disb.clientId ?? 'unassigned'
      const key = typeof id === 'number' ? id.toString() : id
      const clientName = disb.clientName || 'Unassigned'
      if (!groups.has(key)) {
        groups.set(key, {
          key,
          clientId: id,
          clientName,
          disbursementList: [],
          totalAmount: 0,
          statusCount: {},
        })
      }
      const group = groups.get(key)!
      group.disbursementList.push(disb)
      group.totalAmount += disb.requestedAmount || 0
      group.statusCount[disb.status] = (group.statusCount[disb.status] || 0) + 1
    })

    return Array.from(groups.values()).sort((a, b) =>
      a.clientName.localeCompare(b.clientName)
    )
  }, [filteredDisbursements])

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary tracking-tight">Disbursements</h1>
          <p className="text-sm text-text-secondary mt-1">Manage disbursement requests</p>
        </div>
        {(currentUser?.role === 'admin' || currentUser?.role === 'operator') && (
          <Button onClick={() => navigate('/disbursements/new')}>
            New Request
          </Button>
        )}
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
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Disbursed">Disbursed</option>
                <option value="Settled">Settled</option>
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
                  <span className="text-xs text-text-secondary">
                    {disbursements.length}
                  </span>
                </button>
                {clientOptions.map((option) => {
                  const isSelected = clientFilter === option.id
                  const key =
                    typeof option.id === 'number' ? option.id.toString() : option.id
                  return (
                    <button
                      key={`client-filter-${key}`}
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
            Loading disbursements...
          </CardContent>
        </Card>
      ) : filteredDisbursements.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-sm text-text-secondary">
            {statusFilter === 'all' && clientFilter === 'all'
              ? 'No disbursements found. Create your first request!'
              : 'No disbursements match the current filters.'}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {groupedDisbursements.map((group) => (
            <Card key={group.key}>
              <CardHeader className="flex flex-col gap-2 pb-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle className="text-base font-semibold text-text-primary">
                    {group.clientName}
                  </CardTitle>
                  <p className="text-xs text-text-secondary mt-1">
                    {group.disbursementList.length} request
                    {group.disbursementList.length !== 1 ? 's' : ''} · Total requested{' '}
                    {formatMoney(group.totalAmount)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-text-secondary">
                  {(
                    ['Pending', 'Approved', 'Disbursed', 'Settled', 'Cancelled'] as Disbursement['status'][]
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
                        <th className="px-3 py-2 text-left font-semibold">Request #</th>
                        <th className="px-3 py-2 text-right font-semibold">Amount</th>
                        <th className="px-3 py-2 text-left font-semibold">Request Date</th>
                        <th className="px-3 py-2 text-left font-semibold">Status</th>
                        <th className="px-3 py-2 text-left font-semibold">Approved By</th>
                        <th className="px-3 py-2 text-right font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.disbursementList.map((disb) => (
                        <tr
                          key={disb.id}
                          className="border-b border-border-gray/60 last:border-b-0 hover:bg-green-subtle/40"
                        >
                          <td className="px-3 py-2 text-sm font-medium text-text-primary">
                            {disb.requestNumber}
                          </td>
                          <td className="px-3 py-2 text-sm text-right text-text-primary">
                            {formatMoney(disb.requestedAmount)}
                          </td>
                          <td className="px-3 py-2 text-sm text-text-secondary">
                            {formatDate(disb.requestDate)}
                          </td>
                          <td className="px-3 py-2 text-sm">
                            <Badge variant={getStatusBadgeVariant(disb.status)}>
                              {disb.status}
                            </Badge>
                          </td>
                          <td className="px-3 py-2 text-sm text-text-secondary">
                            {disb.approverName || '-'}
                          </td>
                          <td className="px-3 py-2 text-sm text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => navigate(`/disbursements/${disb.id}`)}
                                className="px-2 py-1 text-xs hover:bg-blue-50 rounded text-blue-600 font-medium"
                                title="View details"
                              >
                                View
                              </button>
                              {canApprove && disb.status === 'Pending' && (
                                <>
                                  <button
                                    onClick={() => handleApprove(disb.id)}
                                    className="px-2 py-1 text-xs hover:bg-green-50 rounded text-green-primary font-medium"
                                    title="Approve"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => handleCancel(disb.id)}
                                    className="px-2 py-1 text-xs hover:bg-red-50 rounded text-red-500 font-medium"
                                    title="Cancel"
                                  >
                                    Cancel
                                  </button>
                                </>
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
        </div>
      )}
    </div>
  )
}

