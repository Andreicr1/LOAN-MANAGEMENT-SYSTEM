import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { formatMoney, formatDate } from '@/lib/utils'
import * as XLSX from 'exceljs'

interface AgingReportRow {
  ageCategory: string
  count: number
  totalAmount: number
  totalInterest: number
}

export const Reports: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'aging' | 'period' | 'audit' | 'assets'>('aging')
  const [agingData, setAgingData] = useState<AgingReportRow[]>([])
  const [periodData, setPeriodData] = useState<any>(null)
  const [auditLogs, setAuditLogs] = useState<any[]>([])
  const [acquiredAssets, setAcquiredAssets] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  
  // Period report filters
  const [periodFilters, setPeriodFilters] = useState({
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  })

  useEffect(() => {
    if (activeTab === 'aging') {
      loadAgingReport()
    } else if (activeTab === 'audit') {
      loadAuditLog()
    } else if (activeTab === 'assets') {
      loadAcquiredAssets()
    }
  }, [activeTab])

  const loadAgingReport = async () => {
    setLoading(true)
    try {
      const data = await window.electronAPI.reports.getAgingReport()
      setAgingData(data)
    } catch (error) {
      console.error('Failed to load aging report:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadPeriodReport = async () => {
    setLoading(true)
    try {
      const data = await window.electronAPI.reports.getPeriodReport(
        periodFilters.startDate,
        periodFilters.endDate
      )
      setPeriodData(data)
    } catch (error) {
      console.error('Failed to load period report:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadAuditLog = async () => {
    setLoading(true)
    try {
      const data = await window.electronAPI.audit.getAll()
      setAuditLogs(data)
    } catch (error) {
      console.error('Failed to load audit log:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadAcquiredAssets = async () => {
    setLoading(true)
    try {
      const data = await window.electronAPI.reports.getAcquiredAssets()
      setAcquiredAssets(data)
    } catch (error) {
      console.error('Failed to load acquired assets:', error)
    } finally {
      setLoading(false)
    }
  }

  const exportAgingToExcel = async () => {
    const workbook = new XLSX.Workbook()
    const worksheet = workbook.addWorksheet('Aging Report')

    // Headers
    worksheet.columns = [
      { header: 'Age Category', key: 'ageCategory', width: 20 },
      { header: 'Count', key: 'count', width: 10 },
      { header: 'Total Amount', key: 'totalAmount', width: 15 },
      { header: 'Total Interest', key: 'totalInterest', width: 15 },
    ]

    // Data
    agingData.forEach(row => {
      worksheet.addRow({
        ageCategory: row.ageCategory,
        count: row.count,
        totalAmount: row.totalAmount,
        totalInterest: row.totalInterest,
      })
    })

    // Style
    worksheet.getRow(1).font = { bold: true }
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFEDF3ED' }
    }

    // Save
    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Aging_Report_${new Date().toISOString().split('T')[0]}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportAuditToExcel = async () => {
    const workbook = new XLSX.Workbook()
    const worksheet = workbook.addWorksheet('Audit Log')

    worksheet.columns = [
      { header: 'Timestamp', key: 'timestamp', width: 20 },
      { header: 'User ID', key: 'user_id', width: 10 },
      { header: 'Action', key: 'action', width: 25 },
      { header: 'Details', key: 'details', width: 40 },
    ]

    auditLogs.forEach(log => {
      worksheet.addRow({
        timestamp: log.timestamp,
        user_id: log.user_id,
        action: log.action,
        details: log.details,
      })
    })

    worksheet.getRow(1).font = { bold: true }
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFEDF3ED' }
    }

    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Audit_Log_${new Date().toISOString().split('T')[0]}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportAssetsToExcel = async () => {
    const workbook = new XLSX.Workbook()
    const worksheet = workbook.addWorksheet('Acquired Assets')

    // Headers
    worksheet.columns = [
      { header: 'Asset Description', key: 'asset', width: 50 },
      { header: 'Request #', key: 'requestNumber', width: 15 },
      { header: 'PN Number', key: 'pnNumber', width: 15 },
      { header: 'Request Date', key: 'requestDate', width: 15 },
      { header: 'Amount', key: 'amount', width: 15 },
      { header: 'Status', key: 'status', width: 12 },
    ]

    acquiredAssets.forEach(item => {
      worksheet.addRow({
        asset: item.asset,
        requestNumber: item.requestNumber,
        pnNumber: item.pnNumber,
        requestDate: item.requestDate,
        amount: item.amount,
        status: item.status,
      })
    })

    worksheet.getRow(1).font = { bold: true }
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFEDF3ED' }
    }

    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Acquired_Assets_${new Date().toISOString().split('T')[0]}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-text-primary">Reports</h1>
        <p className="text-text-secondary mt-1">Detailed analysis and exports</p>
      </div>

      {/* Tabs */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 border-b border-border-gray">
            <button
              onClick={() => setActiveTab('aging')}
              className={`pb-2 px-1 text-sm font-medium transition-colors ${
                activeTab === 'aging'
                  ? 'text-green-primary border-b-2 border-green-primary'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Aging Report
            </button>
            <button
              onClick={() => setActiveTab('period')}
              className={`pb-2 px-1 text-sm font-medium transition-colors ${
                activeTab === 'period'
                  ? 'text-green-primary border-b-2 border-green-primary'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Period Report
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`pb-2 px-1 text-sm font-medium transition-colors ${
                activeTab === 'audit'
                  ? 'text-green-primary border-b-2 border-green-primary'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Audit Log
            </button>
            <button
              onClick={() => setActiveTab('assets')}
              className={`pb-2 px-1 text-sm font-medium transition-colors ${
                activeTab === 'assets'
                  ? 'text-green-primary border-b-2 border-green-primary'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Acquired Assets
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Aging Report */}
      {activeTab === 'aging' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Aging Report</CardTitle>
              <Button
                variant="secondary"
                size="sm"
                onClick={exportAgingToExcel}
                disabled={agingData.length === 0}
              >
                Export to Excel
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center text-text-secondary py-8">Loading...</p>
            ) : agingData.length === 0 ? (
              <p className="text-center text-text-secondary py-8">No data available</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-green-subtle border-b-2 border-border-gray">
                      <th className="px-4 py-3 text-left text-sm font-semibold">Age Category</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Count</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Total Amount</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Total Interest</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Combined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agingData.map((row, index) => (
                      <tr key={index} className="border-b border-border-gray">
                        <td className="px-4 py-3 text-sm font-medium">{row.ageCategory}</td>
                        <td className="px-4 py-3 text-sm">{row.count}</td>
                        <td className="px-4 py-3 text-sm font-mono">{formatMoney(row.totalAmount)}</td>
                        <td className="px-4 py-3 text-sm font-mono">{formatMoney(row.totalInterest)}</td>
                        <td className="px-4 py-3 text-sm font-mono font-semibold">
                          {formatMoney(row.totalAmount + row.totalInterest)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-green-subtle font-bold">
                      <td className="px-4 py-3 text-sm">TOTAL</td>
                      <td className="px-4 py-3 text-sm">
                        {agingData.reduce((sum, row) => sum + row.count, 0)}
                      </td>
                      <td className="px-4 py-3 text-sm font-mono">
                        {formatMoney(agingData.reduce((sum, row) => sum + row.totalAmount, 0))}
                      </td>
                      <td className="px-4 py-3 text-sm font-mono">
                        {formatMoney(agingData.reduce((sum, row) => sum + row.totalInterest, 0))}
                      </td>
                      <td className="px-4 py-3 text-sm font-mono">
                        {formatMoney(agingData.reduce((sum, row) => sum + row.totalAmount + row.totalInterest, 0))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Period Report */}
      {activeTab === 'period' && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Select Period</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-4">
                <Input
                  label="Start Date"
                  type="date"
                  value={periodFilters.startDate}
                  onChange={(e) => setPeriodFilters({ ...periodFilters, startDate: e.target.value })}
                />
                <Input
                  label="End Date"
                  type="date"
                  value={periodFilters.endDate}
                  onChange={(e) => setPeriodFilters({ ...periodFilters, endDate: e.target.value })}
                />
                <Button onClick={loadPeriodReport} loading={loading}>
                  Generate Report
                </Button>
              </div>
            </CardContent>
          </Card>

          {periodData && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-text-secondary font-medium">Total Disbursements</p>
                  <p className="text-2xl font-bold text-text-primary mt-2">
                    {formatMoney(periodData.disbursements)}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-text-secondary font-medium">Total Settlements</p>
                  <p className="text-2xl font-bold text-text-primary mt-2">
                    {formatMoney(periodData.settlements)}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-text-secondary font-medium">Interest Accrued</p>
                  <p className="text-2xl font-bold text-text-primary mt-2">
                    {formatMoney(periodData.interestAccrued)}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-text-secondary font-medium">Avg Outstanding</p>
                  <p className="text-2xl font-bold text-text-primary mt-2">
                    {formatMoney(periodData.avgOutstanding)}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}

      {/* Audit Log */}
      {activeTab === 'audit' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Audit Log (Last 1000 entries)</CardTitle>
              <Button
                variant="secondary"
                size="sm"
                onClick={exportAuditToExcel}
                disabled={auditLogs.length === 0}
              >
                Export to Excel
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center text-text-secondary py-8">Loading...</p>
            ) : auditLogs.length === 0 ? (
              <p className="text-center text-text-secondary py-8">No audit logs found</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-green-subtle border-b-2 border-border-gray">
                      <th className="px-4 py-3 text-left text-sm font-semibold">Timestamp</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">User ID</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Action</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="border-b border-border-gray hover:bg-green-subtle">
                        <td className="px-4 py-3 text-sm">{formatDate(log.timestamp)}</td>
                        <td className="px-4 py-3 text-sm">{log.user_id}</td>
                        <td className="px-4 py-3 text-sm font-medium">{log.action}</td>
                        <td className="px-4 py-3 text-sm text-text-secondary">
                          <pre className="text-xs">{log.details}</pre>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Acquired Assets */}
      {activeTab === 'assets' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Acquired Assets</CardTitle>
              <Button
                variant="secondary"
                size="sm"
                onClick={exportAssetsToExcel}
                disabled={acquiredAssets.length === 0}
              >
                Export to Excel
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center text-text-secondary py-8">Loading...</p>
            ) : acquiredAssets.length === 0 ? (
              <p className="text-center text-text-secondary py-8">
                No acquired assets found. Assets will appear here after disbursements are approved.
              </p>
            ) : (
              <>
                <div className="mb-4 p-4 bg-green-subtle/30 rounded-lg">
                  <p className="text-sm font-semibold text-text-primary">
                    Total Assets: {acquiredAssets.length}
                  </p>
                  <p className="text-xs text-text-secondary mt-1">
                    Showing all assets from approved disbursements
                  </p>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-green-subtle border-b-2 border-border-gray">
                        <th className="px-4 py-3 text-left text-sm font-semibold">Asset Description</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Request #</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">PN Number</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Request Date</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Amount</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {acquiredAssets.map((item, index) => (
                        <tr key={index} className="border-b border-border-gray hover:bg-green-subtle">
                          <td className="px-4 py-3 text-sm">{item.asset}</td>
                          <td className="px-4 py-3 text-sm font-medium">{item.requestNumber}</td>
                          <td className="px-4 py-3 text-sm font-mono">{item.pnNumber}</td>
                          <td className="px-4 py-3 text-sm">{formatDate(item.requestDate)}</td>
                          <td className="px-4 py-3 text-sm font-mono">{formatMoney(item.amount)}</td>
                          <td className="px-4 py-3 text-sm">
                            <Badge variant={item.status?.toLowerCase() || 'pending'}>
                              {item.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
