import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { formatMoney, formatDate } from '@/lib/utils'

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
  const [topPNs, setTopPNs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    setLoading(true)
    try {
      const [kpisData, topPNsData] = await Promise.all([
        window.electronAPI.reports.getDashboardKPIs(),
        window.electronAPI.reports.getTopPNs(5),
      ])
      
      setKpis(kpisData)
      setTopPNs(topPNsData)
    } catch (error) {
      console.error('Failed to load dashboard:', error)
    } finally {
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

      {/* Top Promissory Notes */}
      {topPNs.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Largest Active Promissory Notes</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/promissory-notes')}
              >
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topPNs.map((pn) => (
                <div
                  key={pn.id}
                  className="flex items-center justify-between p-3 border border-border-gray rounded-lg hover:bg-green-subtle cursor-pointer"
                  onClick={() => navigate(`/disbursements/${pn.disbursement_id}`)}
                >
                  <div>
                    <p className="font-medium text-sm">{pn.pn_number}</p>
                    <p className="text-xs text-text-secondary">
                      Request: {pn.request_number} | Due: {formatDate(pn.due_date)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-semibold">{formatMoney(pn.principal_amount)}</p>
                    <p className="text-xs text-text-secondary">{pn.interest_rate}% p.a.</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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

