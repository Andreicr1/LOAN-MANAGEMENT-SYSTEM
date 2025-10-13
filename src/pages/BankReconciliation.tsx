import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { useAuthStore } from '@/stores/authStore'
import { formatMoney, formatDate } from '@/lib/utils'

interface BankTransaction {
  id: number
  transactionDate: string
  amount: number
  description?: string
  reference?: string
  matched: boolean
  pn_number?: string
  matched_by_name?: string
  matchedAt?: string
}

interface PromissoryNoteSuggestion {
  id: number
  pn_number: string
  principal_amount: number
  request_number: string
  days_diff: number
}

export const BankReconciliation: React.FC = () => {
  const currentUser = useAuthStore((state) => state.user)
  const [transactions, setTransactions] = useState<BankTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [showImport, setShowImport] = useState(false)
  const [importData, setImportData] = useState({
    transactionDate: '',
    amount: '',
    description: '',
    reference: '',
  })
  const [importing, setImporting] = useState(false)
  const [matchedFilter, setMatchedFilter] = useState<string>('all')
  const [selectedTransaction, setSelectedTransaction] = useState<number | null>(null)
  const [suggestions, setSuggestions] = useState<PromissoryNoteSuggestion[]>([])
  const [summary, setSummary] = useState({
    totalTransactions: 0,
    matchedTransactions: 0,
    unmatchedTransactions: 0,
    matchedAmount: 0,
    unmatchedAmount: 0,
  })

  useEffect(() => {
    loadTransactions()
    loadSummary()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchedFilter])

  const loadTransactions = async () => {
    setLoading(true)
    try {
      const filters = matchedFilter === 'all' 
        ? undefined 
        : { matched: matchedFilter === 'matched' }
      const data = await window.electronAPI.bankRecon.getAll(filters)
      setTransactions(data)
    } catch (error) {
      console.error('Failed to load transactions:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadSummary = async () => {
    try {
      const data = await window.electronAPI.bankRecon.getSummary()
      setSummary(data)
    } catch (error) {
      console.error('Failed to load summary:', error)
    }
  }

  const handleFileImport = async () => {
    // Open file dialog
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.csv'
    
    input.onchange = async (e: any) => {
      const file = e.target?.files?.[0]
      if (!file) return

      setImporting(true)
      try {
        // Read file path (Electron provides access to file path)
        const filePath = (file as any).path
        
        const result = await window.electronAPI.bankRecon.importCSV(filePath)
        
        if (result.success) {
          await window.electronAPI.audit.log(currentUser!.id, 'BANK_TRANSACTIONS_IMPORTED_FROM_CSV', {
            imported: result.imported,
            errors: result.errors.length,
          })
          
          alert(`Successfully imported ${result.imported} transactions!${result.errors.length > 0 ? `\n\nWarning: ${result.errors.length} rows had errors.` : ''}`)
          loadTransactions()
          loadSummary()
        } else {
          alert(`Failed to import transactions.\n\nErrors:\n${result.errors.join('\n')}`)
        }
      } catch (error) {
        console.error('Failed to import CSV:', error)
        alert('Failed to import CSV file')
      } finally {
        setImporting(false)
      }
    }
    
    input.click()
  }

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const result = await window.electronAPI.bankRecon.import({
        transactionDate: importData.transactionDate,
        amount: parseFloat(importData.amount),
        description: importData.description,
        reference: importData.reference,
      })

      if (result.success) {
        await window.electronAPI.audit.log(currentUser!.id, 'BANK_TRANSACTION_IMPORTED', {
          amount: parseFloat(importData.amount),
          date: importData.transactionDate,
        })
        
        setShowImport(false)
        setImportData({
          transactionDate: '',
          amount: '',
          description: '',
          reference: '',
        })
        loadTransactions()
        loadSummary()
      }
    } catch (error) {
      alert('Failed to import transaction')
    }
  }

  const handleMatch = async (transactionId: number, pnId: number) => {
    try {
      const result = await window.electronAPI.bankRecon.match(
        transactionId,
        pnId,
        currentUser!.id
      )

      if (result.success) {
        await window.electronAPI.audit.log(currentUser!.id, 'TRANSACTION_MATCHED', {
          transactionId,
          promissoryNoteId: pnId,
        })
        
        setSelectedTransaction(null)
        setSuggestions([])
        loadTransactions()
        loadSummary()
      }
    } catch (error) {
      alert('Failed to match transaction')
    }
  }

  const handleUnmatch = async (transactionId: number) => {
    if (!confirm('Unmatch this transaction?')) return

    try {
      const result = await window.electronAPI.bankRecon.unmatch(transactionId)

      if (result.success) {
        await window.electronAPI.audit.log(currentUser!.id, 'TRANSACTION_UNMATCHED', {
          transactionId,
        })
        
        loadTransactions()
        loadSummary()
      }
    } catch (error) {
      alert('Failed to unmatch transaction')
    }
  }

  const loadSuggestions = async (transactionId: number) => {
    setSelectedTransaction(transactionId)
    try {
      const data = await window.electronAPI.bankRecon.suggestMatches(transactionId)
      setSuggestions(data)
    } catch (error) {
      console.error('Failed to load suggestions:', error)
    }
  }

  const canMatch = currentUser?.role === 'admin' || currentUser?.role === 'operator'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Bank Reconciliation</h1>
          <p className="text-text-secondary mt-1">Match bank transactions with promissory notes</p>
        </div>
        {canMatch && (
          <div className="flex gap-2">
            <Button onClick={handleFileImport} disabled={importing}>
              {importing ? 'Importing...' : 'Import CSV File'}
            </Button>
            <Button variant="secondary" onClick={() => setShowImport(true)}>
              Manual Import
            </Button>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-text-secondary font-medium">Total Transactions</p>
            <p className="text-2xl font-bold text-text-primary mt-1">{summary.totalTransactions}</p>
            <p className="text-sm text-text-secondary mt-2">
              Amount: {formatMoney(summary.matchedAmount + summary.unmatchedAmount)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-text-secondary font-medium">Matched</p>
            <p className="text-2xl font-bold text-green-primary mt-1">{summary.matchedTransactions}</p>
            <p className="text-sm text-text-secondary mt-2">
              Amount: {formatMoney(summary.matchedAmount)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-text-secondary font-medium">Unmatched</p>
            <p className="text-2xl font-bold text-yellow-600 mt-1">{summary.unmatchedTransactions}</p>
            <p className="text-sm text-text-secondary mt-2">
              Amount: {formatMoney(summary.unmatchedAmount)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-text-primary">Show:</span>
            <select
              value={matchedFilter}
              onChange={(e) => setMatchedFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-border-gray rounded-md focus:outline-none focus:ring-2 focus:ring-green-primary"
              aria-label="Filter by match status"
            >
              <option value="all">All Transactions</option>
              <option value="unmatched">Unmatched Only</option>
              <option value="matched">Matched Only</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <p className="text-center text-text-secondary py-8">Loading transactions...</p>
          ) : transactions.length === 0 ? (
            <p className="text-center text-text-secondary py-8">
              No transactions found. Import bank transactions to start reconciling.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-green-subtle border-b-2 border-border-gray">
                    <th className="px-4 py-3 text-left text-sm font-semibold">Date</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Amount</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Description</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Reference</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Matched To</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((trans) => (
                    <tr key={trans.id} className="border-b border-border-gray hover:bg-green-subtle">
                      <td className="px-4 py-3 text-sm">{formatDate(trans.transactionDate)}</td>
                      <td className="px-4 py-3 text-sm font-mono text-right">
                        {formatMoney(trans.amount)}
                      </td>
                      <td className="px-4 py-3 text-sm">{trans.description || '-'}</td>
                      <td className="px-4 py-3 text-sm">{trans.reference || '-'}</td>
                      <td className="px-4 py-3 text-sm">
                        <Badge variant={trans.matched ? 'disbursed' : 'pending'}>
                          {trans.matched ? 'Matched' : 'Unmatched'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {trans.pn_number ? (
                          <span className="font-medium">{trans.pn_number}</span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        {canMatch && (
                          <div className="flex items-center justify-end gap-2">
                            {!trans.matched ? (
                              <button
                                onClick={() => loadSuggestions(trans.id)}
                                className="px-2 py-1 text-xs hover:bg-green-50 rounded text-green-primary font-medium"
                                title="Match"
                              >
                                Match
                              </button>
                            ) : (
                              <button
                                onClick={() => handleUnmatch(trans.id)}
                                className="px-2 py-1 text-xs hover:bg-red-50 rounded text-red-500 font-medium"
                                title="Unmatch"
                              >
                                Unmatch
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Suggestions Modal */}
      {selectedTransaction && suggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Suggested Matches</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {suggestions.map((suggestion) => (
                <div
                  key={suggestion.id}
                  className="flex items-center justify-between p-3 border border-border-gray rounded-lg hover:bg-green-subtle"
                >
                  <div>
                    <p className="font-medium">{suggestion.pn_number}</p>
                    <p className="text-sm text-text-secondary">
                      Request: {suggestion.request_number} | 
                      Amount: {formatMoney(suggestion.principal_amount)} | 
                      {suggestion.days_diff === 0 ? 'Same day' : `${suggestion.days_diff} day(s) difference`}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleMatch(selectedTransaction, suggestion.id)}
                  >
                    Match
                  </Button>
                </div>
              ))}
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="mt-4"
              onClick={() => {
                setSelectedTransaction(null)
                setSuggestions([])
              }}
            >
              Cancel
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Import Modal */}
      {showImport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Import Bank Transaction</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleImport} className="space-y-4">
                <Input
                  label="Transaction Date"
                  type="date"
                  value={importData.transactionDate}
                  onChange={(e) => setImportData({ ...importData, transactionDate: e.target.value })}
                  required
                />

                <Input
                  label="Amount (USD)"
                  numeric
                  value={importData.amount}
                  onChange={(e) => setImportData({ ...importData, amount: e.target.value })}
                  placeholder="0,00"
                  required
                />

                <Input
                  label="Description (optional)"
                  value={importData.description}
                  onChange={(e) => setImportData({ ...importData, description: e.target.value })}
                  placeholder="Transaction description"
                />

                <Input
                  label="Reference (optional)"
                  value={importData.reference}
                  onChange={(e) => setImportData({ ...importData, reference: e.target.value })}
                  placeholder="Check number or reference"
                />

                <div className="flex gap-3 pt-4">
                  <Button type="submit" variant="primary">
                    Import
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowImport(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
