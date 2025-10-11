import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { formatMoney, formatDate } from '@/lib/utils'

interface Client {
  id: number
  name: string
  taxId: string
  status: string
}

interface ClientStats {
  total_disbursements: number
  approved: number
  pending: number
  total_requested: number
}

interface ClientData {
  client: Client
  stats: ClientStats
  activePNs: any[]
  totalOutstanding: number
}

interface DashboardKPIs {
  totalCreditLimit: number
  availableLimit: number
  outstandingBalance: number
  accumulatedInterest: number
  activePNs: number
  overduePNs: number
}

export const Dashboard: React.FC = () => {
  const navigate = useNavigate()
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null)
  const [clientsData, setClientsData] = useState<ClientData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    setLoading(true)
    try {
      // Load KPIs first (always works)
      const kpisData = await window.electronAPI.reports.getDashboardKPIs()
      setKpis(kpisData)
      setLoading(false)

      // Load clients data in background (may fail if clients table doesn't exist yet)
      try {
        const clientsList = await window.electronAPI.clients.getActive()
        
        if (clientsList && clientsList.length > 0) {
          const clientsWithData = await Promise.all(
            clientsList.map(async (client: Client) => {
              try {
                const [stats, pns] = await Promise.all([
                  window.electronAPI.clients.getStats(client.id),
                  window.electronAPI.reports.getClientPNs(client.id).catch(() => []),
                ])
                
                const totalOutstanding = (pns || []).reduce((sum: number, pn: any) => 
                  sum + (pn.status === 'Active' ? pn.principal_amount : 0), 0
                )

                return {
                  client,
                  stats: stats || { total_disbursements: 0, approved: 0, pending: 0, total_requested: 0 },
                  activePNs: (pns || []).filter((pn: any) => pn.status === 'Active'),
                  totalOutstanding,
                }
              } catch (clientError) {
                console.error(`Error loading data for client ${client.id}:`, clientError)
                return null
              }
            })
          )

          setClientsData(clientsWithData.filter(Boolean) as ClientData[])
        }
      } catch (clientsError) {
        console.error('Failed to load clients data:', clientsError)
        // Continue without clients data - KPIs are already loaded
      }
    } catch (error) {
      console.error('Failed to load dashboard KPIs:', error)
      setLoading(false)
    }
  }

  if (loading || !kpis) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-text-primary">Dashboard</h1>
        <p className="text-text-secondary">Loading dashboard data...</p>
      </div>
    )
  }

  const utilizationRate = ((kpis.outstandingBalance / kpis.totalCreditLimit) * 100).toFixed(1)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Dashboard</h1>
          <p className="text-text-secondary mt-1">Overview of credit line status</p>
        </div>
        <Button onClick={() => navigate('/disbursements/new')}>
          New Disbursement
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-text-secondary font-medium">Total Credit Limit</p>
            <p className="text-2xl font-bold text-text-primary mt-1">
              {formatMoney(kpis.totalCreditLimit)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-text-secondary font-medium">Available Limit</p>
            <p className="text-2xl font-bold text-green-primary mt-1">
              {formatMoney(kpis.availableLimit)}
            </p>
            <p className="text-xs text-text-secondary mt-1">
              {utilizationRate}% utilized
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-text-secondary font-medium">Outstanding Balance</p>
            <p className="text-2xl font-bold text-text-primary mt-1">
              {formatMoney(kpis.outstandingBalance)}
            </p>
            <p className="text-xs text-text-secondary mt-1">
              {kpis.activePNs} active PN{kpis.activePNs !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-text-secondary font-medium">Accumulated Interest</p>
            <p className="text-2xl font-bold text-text-primary mt-1">
              {formatMoney(kpis.accumulatedInterest)}
            </p>
            {kpis.overduePNs > 0 && (
              <p className="text-xs text-red-500 mt-1">
                {kpis.overduePNs} overdue PN{kpis.overduePNs !== 1 ? 's' : ''}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {kpis.overduePNs > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-red-800">
                  {kpis.overduePNs} Promissory Note{kpis.overduePNs !== 1 ? 's' : ''} Overdue
                </p>
                <p className="text-sm text-red-700 mt-1">
                  Review overdue promissory notes and take appropriate action.
                </p>
              </div>
              <Button
                variant="danger"
                size="sm"
                onClick={() => navigate('/promissory-notes')}
              >
                View Details
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Clients Overview */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-text-primary">Clients Overview</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/clients')}
          >
            {clientsData.length > 0 ? 'Manage Clients' : 'Add First Client'}
          </Button>
        </div>

        {clientsData.length === 0 ? (
          <Card className="border-2 border-dashed">
            <CardContent className="pt-6 pb-6">
              <div className="text-center py-8">
                <p className="text-lg font-semibold text-text-primary mb-2">No Clients Yet</p>
                <p className="text-sm text-text-secondary mb-4">
                  Add your first client to start managing disbursements and promissory notes.
                </p>
                <Button onClick={() => navigate('/clients')}>
                  Add Client
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (

          <div className="grid grid-cols-1 gap-6">
            {clientsData.map(({ client, stats, activePNs, totalOutstanding }) => (
              <Card key={client.id} className="border-2 hover:border-green-primary transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-xl">{client.name}</CardTitle>
                      <Badge variant={client.status === 'Active' ? 'success' : 'default'}>
                        {client.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-text-secondary font-mono">{client.taxId}</p>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <div className="bg-green-subtle p-4 rounded-lg">
                      <p className="text-xs text-text-secondary font-medium mb-1">Total Disbursements</p>
                      <p className="text-2xl font-bold text-text-primary">{stats.total_disbursements || 0}</p>
                      <p className="text-xs text-text-secondary mt-1">
                        {stats.approved || 0} approved
                      </p>
                    </div>
                    <div className="bg-green-subtle p-4 rounded-lg">
                      <p className="text-xs text-text-secondary font-medium mb-1">Total Requested</p>
                      <p className="text-2xl font-bold text-text-primary">
                        {formatMoney(stats.total_requested || 0)}
                      </p>
                    </div>
                    <div className="bg-green-subtle p-4 rounded-lg">
                      <p className="text-xs text-text-secondary font-medium mb-1">Outstanding Balance</p>
                      <p className="text-2xl font-bold text-text-primary">
                        {formatMoney(totalOutstanding)}
                      </p>
                    </div>
                    <div className="bg-green-subtle p-4 rounded-lg">
                      <p className="text-xs text-text-secondary font-medium mb-1">Active PNs</p>
                      <p className="text-2xl font-bold text-text-primary">{activePNs.length}</p>
                      {stats.pending > 0 && (
                        <p className="text-xs text-orange-600 mt-1">
                          {stats.pending} pending
                        </p>
                      )}
                    </div>
                  </div>

                  {activePNs.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-border-gray">
                      <p className="text-sm font-semibold text-text-primary mb-3">
                        Active Promissory Notes
                      </p>
                      <div className="space-y-2">
                        {activePNs.slice(0, 3).map((pn: any) => (
                          <div
                            key={pn.id}
                            className="flex items-center justify-between p-2 border border-border-gray rounded hover:bg-green-subtle cursor-pointer text-sm"
                            onClick={() => navigate(`/disbursements/${pn.disbursement_id}`)}
                          >
                            <div>
                              <p className="font-medium">{pn.pn_number}</p>
                              <p className="text-xs text-text-secondary">
                                Due: {formatDate(pn.due_date)}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-mono font-semibold">{formatMoney(pn.principal_amount)}</p>
                              <p className="text-xs text-text-secondary">{pn.interest_rate}% p.a.</p>
                            </div>
                          </div>
                        ))}
                        {activePNs.length > 3 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full"
                            onClick={() => navigate('/promissory-notes')}
                          >
                            View all {activePNs.length} promissory notes
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card
          className="cursor-pointer hover:border-green-primary transition-colors"
          onClick={() => navigate('/disbursements/new')}
        >
          <CardContent className="pt-6 pb-6">
            <div className="text-center">
              <p className="font-semibold text-lg mb-2">New Disbursement</p>
              <p className="text-xs text-text-secondary">Create a new disbursement request</p>
            </div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:border-green-primary transition-colors"
          onClick={() => navigate('/bank-reconciliation')}
        >
          <CardContent className="pt-6 pb-6">
            <div className="text-center">
              <p className="font-semibold text-lg mb-2">Bank Reconciliation</p>
              <p className="text-xs text-text-secondary">Match transactions with PNs</p>
            </div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:border-green-primary transition-colors"
          onClick={() => navigate('/reports')}
        >
          <CardContent className="pt-6 pb-6">
            <div className="text-center">
              <p className="font-semibold text-lg mb-2">View Reports</p>
              <p className="text-xs text-text-secondary">Detailed analysis and exports</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

