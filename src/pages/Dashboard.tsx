import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { formatMoney, formatDateTime } from '@/lib/utils'

interface Client {
  id: number
  name: string
  taxId: string
  status: string
  credit_limit?: number
  creditLimit?: number
}

interface ClientStats {
  total_disbursements: number
  approved: number
  pending: number
  total_requested: number
}

interface PromissoryNoteSummary {
  id: number
  disbursement_id: number
  status: string
  principal_amount: number
}

interface BankTransactionSummary {
  promissoryNoteId?: number
  amount: number
  matched?: boolean
  description?: string
  reference?: string
}

interface ClientMetric {
  id: number
  name: string
  taxId: string
  status: string
  totalLimit: number
  availableLimit: number
  interestDue: number
  operations: number
  outstandingPrincipal: number
}

type SignwellNotificationType = 'promissory_note' | 'wire_transfer'

interface SignwellNotificationItem {
  id: number
  type: SignwellNotificationType
  reference: string
  requestNumber?: string
  disbursementId?: number
  clientName?: string | null
  status?: string | null
  completedAt?: string | null
  attachmentPath?: string | null
  documentId: string
}

const INTEREST_KEYWORDS = ['interest', 'juros', 'finance charge', 'int ', 'int.', 'int-']

const isInterestDescriptor = (raw: string | undefined | null): boolean => {
  if (!raw) return false
  const normalized = raw.toLowerCase()
  return INTEREST_KEYWORDS.some((term) => normalized.includes(term))
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
  const [clientMetrics, setClientMetrics] = useState<ClientMetric[]>([])
  const [signwellNotifications, setSignwellNotifications] = useState<SignwellNotificationItem[]>([])
  const [downloadingDocumentId, setDownloadingDocumentId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchSignwellNotifications = async () => {
    try {
      if (window.electronAPI?.signwell?.syncCompletedDocuments) {
        await window.electronAPI.signwell.syncCompletedDocuments()
      }

      const result = await window.electronAPI?.reports?.getSignwellNotifications?.()
      if (Array.isArray(result)) {
        setSignwellNotifications(result as SignwellNotificationItem[])
      } else {
        setSignwellNotifications([])
      }
    } catch (error) {
      console.error('Failed to load SignWell notifications:', error)
      setSignwellNotifications([])
    }
  }

  useEffect(() => {
    loadDashboardData()

    window.electronAPI?.onSignwellDocumentCompleted?.(() => {
      fetchSignwellNotifications()
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadDashboardData = async () => {
    setLoading(true)
    try {
      try {
        const kpisData = await window.electronAPI?.reports?.getDashboardKPIs?.()
        setKpis(kpisData)
      } catch (kpiError) {
        console.error('Failed to load dashboard KPIs:', kpiError)
        setKpis({
          totalCreditLimit: 0,
          availableLimit: 0,
          outstandingBalance: 0,
          accumulatedInterest: 0,
          activePNs: 0,
          overduePNs: 0,
        })
      }

      const results = await Promise.allSettled([
        window.electronAPI?.clients?.getActive?.() ?? Promise.resolve([]),
        window.electronAPI?.disbursements?.getAll?.() ?? Promise.resolve([]),
        window.electronAPI?.promissoryNotes?.getAll?.() ?? Promise.resolve([]),
        window.electronAPI?.debitNotes?.getAll?.() ?? Promise.resolve([]),
        window.electronAPI?.bankRecon?.getAll?.({ matched: true }) ?? Promise.resolve([]),
      ])

      const [clientsResult, disbursementsResult, promissoryNotesResult, debitNotesResult, bankTransactionsResult] = results

      const clientsList: Client[] =
        clientsResult.status === 'fulfilled' ? (clientsResult.value as Client[]) : []
      if (clientsResult.status === 'rejected') {
        console.error('Failed to load clients data:', clientsResult.reason)
      }

      const disbursementsList: any[] =
        disbursementsResult.status === 'fulfilled' ? (disbursementsResult.value as any[]) : []
      if (disbursementsResult.status === 'rejected') {
        console.error('Failed to load disbursements for dashboard:', disbursementsResult.reason)
      }

      const promissoryNotesList: PromissoryNoteSummary[] =
        promissoryNotesResult.status === 'fulfilled'
          ? (promissoryNotesResult.value as PromissoryNoteSummary[])
          : []
      if (promissoryNotesResult.status === 'rejected') {
        console.error('Failed to load promissory notes for dashboard:', promissoryNotesResult.reason)
      }

      const debitNotesList: any[] =
        debitNotesResult.status === 'fulfilled' ? (debitNotesResult.value as any[]) : []
      if (debitNotesResult.status === 'rejected') {
        console.error('Failed to load debit notes for dashboard:', debitNotesResult.reason)
      }

      const bankTransactions: BankTransactionSummary[] =
        bankTransactionsResult.status === 'fulfilled'
          ? (bankTransactionsResult.value as BankTransactionSummary[])
          : []
      if (bankTransactionsResult.status === 'rejected') {
        console.error('Failed to load bank reconciliation data for dashboard:', bankTransactionsResult.reason)
      }

      if (clientsList.length === 0) {
        setClientMetrics([])
        return
      }

      const statsEntries = await Promise.all(
        clientsList.map(async (client) => {
          try {
            const stats = await window.electronAPI?.clients?.getStats?.(client.id)
            return [client.id, stats || { total_disbursements: 0, approved: 0, pending: 0, total_requested: 0 }]
          } catch (statsError) {
            console.error(`Error loading stats for client ${client.id}:`, statsError)
            return [client.id, { total_disbursements: 0, approved: 0, pending: 0, total_requested: 0 }]
          }
        })
      )
      const statsByClient = new Map<number, ClientStats>(statsEntries as any)

      const disbursementIdsByClient = new Map<number, number[]>()
      disbursementsList.forEach((disbursement: any) => {
        if (!disbursement?.clientId) return
        const current = disbursementIdsByClient.get(disbursement.clientId) ?? []
        current.push(disbursement.id)
        disbursementIdsByClient.set(disbursement.clientId, current)
      })

      const activePromissoryNotes = promissoryNotesList.filter((pn) =>
        ['Active', 'Overdue'].includes(pn.status)
      )

      const interestPairs = await Promise.all(
        activePromissoryNotes.map(async (pn) => {
          try {
            const interest = await window.electronAPI?.interest?.getForPN?.(pn.id)
            return [pn.id, interest ?? 0]
          } catch (interestError) {
            console.error(`Error computing interest for PN ${pn.id}:`, interestError)
            return [pn.id, 0]
          }
        })
      )
      const interestByPromissoryNote = new Map<number, number>(interestPairs as any)

      const paidDebitNotes = debitNotesList.filter((dn) => dn?.status === 'Paid')
      const debitNoteDetails = await Promise.all(
        paidDebitNotes.map(async (dn) => {
          try {
            return await window.electronAPI?.debitNotes?.getById?.(dn.id)
          } catch (detailError) {
            console.error(`Error loading debit note detail ${dn.id}:`, detailError)
            return null
          }
        })
      )

      const interestPaidByDebitNote = new Map<number, number>()
      debitNoteDetails.forEach((detail) => {
        if (!detail?.items) return
        detail.items.forEach((item: any) => {
          if (!item?.promissoryNoteId) return
          const current = interestPaidByDebitNote.get(item.promissoryNoteId) ?? 0
          interestPaidByDebitNote.set(
            item.promissoryNoteId,
            current + (item.interestAmount ?? 0)
          )
        })
      })

      const interestPaidByBank = new Map<number, number>()
      // Treat matched bank transactions tagged with interest-related keywords as interest payments
      bankTransactions.forEach((transaction) => {
        if (!transaction?.promissoryNoteId || !transaction.matched) return
        if (
          !isInterestDescriptor(transaction.description) &&
          !isInterestDescriptor(transaction.reference)
        ) {
          return
        }
        const absoluteAmount = Math.abs(transaction.amount ?? 0)
        if (!absoluteAmount) return
        const current = interestPaidByBank.get(transaction.promissoryNoteId) ?? 0
        interestPaidByBank.set(transaction.promissoryNoteId, current + absoluteAmount)
      })

      const metrics = clientsList
        .map((client) => {
          const disbursementIds = disbursementIdsByClient.get(client.id) ?? []
          const clientNotes = activePromissoryNotes.filter((pn) =>
            disbursementIds.includes(pn.disbursement_id)
          )

          const outstandingPrincipal = clientNotes.reduce(
            (sum, pn) => sum + (pn.principal_amount ?? 0),
            0
          )
          if (outstandingPrincipal <= 0) {
            return null
          }

          const rawLimit =
            typeof client.credit_limit === 'number'
              ? client.credit_limit
              : typeof client.creditLimit === 'number'
              ? client.creditLimit
              : 0

          const availableLimit =
            rawLimit > 0 ? Math.max(rawLimit - outstandingPrincipal, 0) : 0

          const interestAccrued = clientNotes.reduce(
            (sum, pn) => sum + (interestByPromissoryNote.get(pn.id) ?? 0),
            0
          )

          const interestSettled = clientNotes.reduce((sum, pn) => {
            const viaDebit = interestPaidByDebitNote.get(pn.id) ?? 0
            const viaBank = interestPaidByBank.get(pn.id) ?? 0
            return sum + viaDebit + viaBank
          }, 0)

          const interestDue = Math.max(interestAccrued - interestSettled, 0)

          const stats = statsByClient.get(client.id)
          const operations =
            stats?.total_disbursements ?? disbursementIds.length

          return {
            id: client.id,
            name: client.name,
            taxId: client.taxId,
            status: client.status,
            totalLimit: rawLimit,
            availableLimit,
            interestDue,
            operations,
            outstandingPrincipal,
          } as ClientMetric | null
        })
        .filter((metric): metric is ClientMetric => Boolean(metric))
        .sort((a, b) => b.outstandingPrincipal - a.outstandingPrincipal)

      setClientMetrics(metrics)
      await fetchSignwellNotifications()
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
      setClientMetrics([])
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadSignedDocument = async (notification: SignwellNotificationItem) => {
    if (!notification.documentId) {
      return
    }

    setDownloadingDocumentId(notification.documentId)
    try {
      const result = await window.electronAPI?.signwell?.downloadAndAttach?.({
        documentId: notification.documentId,
        documentType: notification.type,
      })

      if (result?.success) {
        const savedPath = result.path as string | undefined
        await fetchSignwellNotifications()
        if (savedPath) {
          alert(`Signed document saved to:\n${savedPath}`)
        } else {
          alert('Signed document downloaded and attached successfully.')
        }
      } else {
        alert(`Failed to download signed document:\n\n${result?.error || 'Unknown error'}`)
      }
    } catch (error: any) {
      console.error('Failed to download signed document:', error)
      alert(`Error downloading signed document:\n\n${error?.message || error}`)
    } finally {
      setDownloadingDocumentId(null)
    }
  }

  const handleOpenSignedDocument = (notification: SignwellNotificationItem) => {
    if (!notification.attachmentPath) return
    try {
      window.electronAPI?.openPDF?.(notification.attachmentPath)
    } catch (error) {
      console.error('Failed to open signed document:', error)
      alert('Unable to open the signed document.')
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

  const utilizationRate =
    kpis.totalCreditLimit > 0
      ? ((kpis.outstandingBalance / kpis.totalCreditLimit) * 100).toFixed(1)
      : '0.0'
  const exposureTotals = clientMetrics.reduce(
    (acc, metric) => {
      acc.totalLimit += metric.totalLimit
      acc.availableLimit += metric.availableLimit
      acc.interestDue += metric.interestDue
      acc.operations += metric.operations
      acc.outstandingPrincipal += metric.outstandingPrincipal
      return acc
    },
    {
      totalLimit: 0,
      availableLimit: 0,
      interestDue: 0,
      operations: 0,
      outstandingPrincipal: 0,
    }
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary tracking-tight">Dashboard</h1>
          <p className="text-sm text-text-secondary mt-1">Overview of credit line status</p>
        </div>
        <Button onClick={() => navigate('/disbursements/new')}>
          New Disbursement
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
              Total Credit Limit
            </p>
            <p className="text-xl font-semibold text-text-primary mt-2">
              {formatMoney(kpis.totalCreditLimit)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
              Available Limit
            </p>
            <p className="text-xl font-semibold text-green-primary mt-2">
              {formatMoney(kpis.availableLimit)}
            </p>
            <p className="text-xs text-text-secondary mt-1">
              {utilizationRate}% utilized
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
              Outstanding Balance
            </p>
            <p className="text-xl font-semibold text-text-primary mt-2">
              {formatMoney(kpis.outstandingBalance)}
            </p>
            <p className="text-xs text-text-secondary mt-1">
              {kpis.activePNs} active PN{kpis.activePNs !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
              Accumulated Interest
            </p>
            <p className="text-xl font-semibold text-text-primary mt-2">
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
                <p className="text-sm font-medium text-red-800">
                  {kpis.overduePNs} Promissory Note{kpis.overduePNs !== 1 ? 's' : ''} Overdue
                </p>
                <p className="text-xs text-red-700 mt-1">
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

      {/* Active Client Exposure */}
      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-text-primary">
              Active Client Exposure
            </CardTitle>
            <p className="text-xs text-text-secondary mt-1">
              Clients with outstanding principal and net interest due
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/clients')}>
            Manage Clients
          </Button>
        </CardHeader>
        <CardContent className="pt-0">
          {clientMetrics.length === 0 ? (
            <div className="py-8 text-center text-sm text-text-secondary">
              No active client exposure right now. Approved disbursements will appear here.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-border-gray/70 text-xs uppercase tracking-wide text-text-secondary">
                      <th className="px-3 py-3 text-left font-semibold">Client</th>
                      <th className="px-3 py-3 text-right font-semibold">Total Limit</th>
                      <th className="px-3 py-3 text-right font-semibold">Available Limit</th>
                      <th className="px-3 py-3 text-right font-semibold">Interest Due</th>
                      <th className="px-3 py-3 text-center font-semibold">Operations</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientMetrics.map((metric) => (
                      <tr
                        key={metric.id}
                        className="border-b border-border-gray/40 last:border-b-0 hover:bg-green-subtle/40 transition-colors"
                      >
                        <td className="px-3 py-3 align-top">
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-text-primary">{metric.name}</p>
                            <p className="text-xs text-text-secondary">{metric.taxId}</p>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-right text-sm text-text-primary">
                          {metric.totalLimit > 0 ? formatMoney(metric.totalLimit) : '-'}
                        </td>
                        <td className="px-3 py-3 text-right text-sm text-text-primary">
                          {metric.totalLimit > 0 ? formatMoney(metric.availableLimit) : '-'}
                        </td>
                        <td className="px-3 py-3 text-right text-sm font-semibold text-red-600">
                          {formatMoney(metric.interestDue)}
                        </td>
                        <td className="px-3 py-3 text-center text-sm text-text-primary">
                          {metric.operations}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-green-subtle/50 text-xs font-semibold text-text-primary">
                      <td className="px-3 py-2 text-left">Total</td>
                      <td className="px-3 py-2 text-right">
                        {formatMoney(exposureTotals.totalLimit)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {formatMoney(exposureTotals.availableLimit)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {formatMoney(exposureTotals.interestDue)}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {exposureTotals.operations}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <div className="mt-3 text-xs text-text-secondary">
                Outstanding principal across clients:{' '}
                {formatMoney(exposureTotals.outstandingPrincipal)}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card
          className="cursor-pointer hover:border-green-primary transition-colors"
          onClick={() => navigate('/disbursements/new')}
        >
          <CardContent className="pt-6 pb-6">
            <div className="text-center">
              <p className="font-medium text-base mb-2">New Disbursement</p>
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
              <p className="font-medium text-base mb-2">Bank Reconciliation</p>
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
              <p className="font-medium text-base mb-2">View Reports</p>
              <p className="text-xs text-text-secondary">Detailed analysis and exports</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* New Documents Signed */}
      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-text-primary">
              New Documents Signed
            </CardTitle>
            <p className="text-xs text-text-secondary mt-1">
              Documents completed via SignWell awaiting download or already attached
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={fetchSignwellNotifications}>
            Refresh
          </Button>
        </CardHeader>
        <CardContent className="pt-0">
          {signwellNotifications.length === 0 ? (
            <div className="py-6 text-center text-sm text-text-secondary">
              All caught up! No signed documents pending download.
            </div>
          ) : (
            <div className="space-y-4">
              {signwellNotifications.map((notification) => (
                <div
                  key={`${notification.type}-${notification.id}`}
                  className="flex flex-col gap-3 border-b border-border-gray/40 pb-4 last:border-b-0 last:pb-0 md:flex-row md:items-center md:justify-between"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-text-primary">
                      {notification.type === 'promissory_note'
                        ? `Promissory Note ${notification.reference}`
                        : `Wire Transfer ${notification.reference}`}
                    </p>
                    {notification.requestNumber && (
                      <p className="text-xs text-text-secondary">
                        Request: {notification.requestNumber}
                      </p>
                    )}
                    {notification.clientName && (
                      <p className="text-xs text-text-secondary">
                        Client: {notification.clientName}
                      </p>
                    )}
                    {notification.completedAt && (
                      <p className="text-xs text-text-secondary">
                        Signed on {formatDateTime(notification.completedAt)}
                      </p>
                    )}
                    {notification.attachmentPath && (
                      <p className="text-xs text-green-700">
                        Attached to record
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {notification.attachmentPath ? (
                      <>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleOpenSignedDocument(notification)}
                        >
                          View Document
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownloadSignedDocument(notification)}
                          loading={downloadingDocumentId === notification.documentId}
                        >
                          Re-download
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleDownloadSignedDocument(notification)}
                        loading={downloadingDocumentId === notification.documentId}
                      >
                        Download Signed PDF
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

