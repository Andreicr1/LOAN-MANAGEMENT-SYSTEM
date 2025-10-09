import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/Card'
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Disbursements</h1>
          <p className="text-text-secondary mt-1">Manage disbursement requests</p>
        </div>
        {(currentUser?.role === 'admin' || currentUser?.role === 'operator') && (
          <Button onClick={() => navigate('/disbursements/new')}>
            New Request
          </Button>
        )}
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
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Disbursed">Disbursed</option>
              <option value="Settled">Settled</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <p className="text-center text-text-secondary py-8">Loading disbursements...</p>
          ) : disbursements.length === 0 ? (
            <p className="text-center text-text-secondary py-8">
              No disbursements found. Create your first request!
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-green-subtle border-b-2 border-border-gray">
                    <th className="px-4 py-3 text-left text-sm font-semibold">Request #</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Client</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Amount</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Request Date</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Approved By</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {disbursements.map((disb) => (
                    <tr key={disb.id} className="border-b border-border-gray hover:bg-green-subtle">
                      <td className="px-4 py-3 text-sm font-medium">{disb.requestNumber}</td>
                      <td className="px-4 py-3 text-sm">{disb.clientName || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm font-mono text-right">
                        {formatMoney(disb.requestedAmount)}
                      </td>
                      <td className="px-4 py-3 text-sm">{formatDate(disb.requestDate)}</td>
                      <td className="px-4 py-3 text-sm">
                        <Badge variant={getStatusBadgeVariant(disb.status)}>
                          {disb.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary">
                        {disb.approverName || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
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
          )}
        </CardContent>
      </Card>
    </div>
  )
}

