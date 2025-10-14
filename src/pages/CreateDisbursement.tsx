import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuthStore } from '@/stores/authStore'

export const CreateDisbursement: React.FC = () => {
  const navigate = useNavigate()
  const currentUser = useAuthStore((state) => state.user)
  
  const [formData, setFormData] = useState({
    clientId: '1', // Default to Whole Max
    requestedAmount: '',
    requestDate: new Date().toISOString().split('T')[0],
    description: '',
  })
  
  const [clients, setClients] = useState<any[]>([])
  const [assets, setAssets] = useState<string[]>([''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [parsingPDF, setParsingPDF] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadClients()
  }, [])

  const loadClients = async () => {
    try {
    const data = await window.electronAPI?.clients?.getActive?.()
      setClients(data)
    } catch (error) {
      console.error('Failed to load clients:', error)
    }
  }

  const handleAddAsset = () => {
    setAssets([...assets, ''])
  }

  const handleRemoveAsset = (index: number) => {
    setAssets(assets.filter((_, i) => i !== index))
  }

  const handleAssetChange = (index: number, value: string) => {
    const newAssets = [...assets]
    newAssets[index] = value
    setAssets(newAssets)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.type !== 'application/pdf') {
      setError('Please upload a PDF file')
      return
    }

    setUploadedFile(file)
    setParsingPDF(true)
    setError('')

    try {
      // Read file as base64
      const reader = new FileReader()
      reader.onload = async (event) => {
        const base64 = event.target?.result as string
        
        // Call electron API to parse PDF
        const result = await window.electronAPI.parsePDF?.(base64)
        
        if (result?.success && result.assets && result.assets.length > 0) {
          setAssets(result.assets)
        } else {
          setError('Could not extract assets from PDF. Please add them manually.')
        }
        setParsingPDF(false)
      }
      reader.onerror = () => {
        setError('Error reading PDF file')
        setParsingPDF(false)
      }
      reader.readAsDataURL(file)
    } catch (err) {
      setError('Error parsing PDF')
      setParsingPDF(false)
    }
  }

  const handleRemoveFile = () => {
    setUploadedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!formData.requestedAmount || parseFloat(formData.requestedAmount) <= 0) {
      setError('Please enter a valid amount')
      return
    }

    setLoading(true)

    try {
      const assetsList = assets.filter(a => a.trim() !== '')
      
      const result = await window.electronAPI?.disbursements?.create?.({
        clientId: parseInt(formData.clientId),
        requestedAmount: parseFloat(formData.requestedAmount),
        requestDate: formData.requestDate,
        description: formData.description,
        assetsList: assetsList.length > 0 ? assetsList : undefined,
        createdBy: currentUser!.id,
      })

      if (result.success) {
        await window.electronAPI?.audit?.log?.(currentUser!.id, 'DISBURSEMENT_CREATED', {
          requestNumber: result.requestNumber,
          amount: parseFloat(formData.requestedAmount),
        })
        
        navigate(`/disbursements/${result.disbursementId}`)
      } else {
        setError(result.error || 'Failed to create disbursement')
      }
    } catch (err: any) {
      setError('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={() => navigate('/disbursements')}
        >
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-text-primary">New Disbursement Request</h1>
          <p className="text-text-secondary mt-1">Create a new disbursement request</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Disbursement Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-text-primary mb-1.5">
                Client *
              </label>
              <select
                value={formData.clientId}
                onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                className="w-full px-3 py-2.5 text-sm border border-border-gray rounded-md focus:outline-none focus:ring-2 focus:ring-green-primary"
                aria-label="Select client"
                required
              >
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name} - {client.taxId}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Requested Amount (USD)"
                numeric
                value={formData.requestedAmount}
                onChange={(e) => setFormData({ ...formData, requestedAmount: e.target.value })}
                placeholder="0,00"
                required
              />

              <Input
                label="Request Date"
                type="date"
                value={formData.requestDate}
                onChange={(e) => setFormData({ ...formData, requestDate: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-text-primary mb-1.5">
                Description (optional)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2.5 text-sm border border-border-gray rounded-md focus:outline-none focus:ring-2 focus:ring-green-primary"
                rows={3}
                placeholder="Enter description or notes..."
              />
            </div>

            {/* PDF Upload */}
            <div>
              <label className="block text-sm font-semibold text-text-primary mb-3">
                Upload Signed PDF from Whole Max (optional)
              </label>
              <div className="space-y-3">
                {!uploadedFile ? (
                  <div className="border-2 border-dashed border-border-gray rounded-lg p-6 text-center">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="pdf-upload"
                    />
                    <label
                      htmlFor="pdf-upload"
                      className="cursor-pointer inline-flex flex-col items-center"
                    >
                      <div className="w-12 h-12 bg-green-subtle rounded-lg flex items-center justify-center mb-3">
                        <svg className="w-8 h-8 text-green-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                      </div>
                      <span className="text-sm font-medium text-text-primary">
                        Click to upload PDF
                      </span>
                      <span className="text-xs text-text-secondary mt-1">
                        Assets will be extracted automatically
                      </span>
                    </label>
                  </div>
                ) : (
                  <div className="border border-border-gray rounded-lg p-4 flex items-center justify-between bg-green-subtle/30">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white rounded flex items-center justify-center">
                        <svg className="w-6 h-6 text-green-primary" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-text-primary">{uploadedFile.name}</p>
                        <p className="text-xs text-text-secondary">
                          {parsingPDF ? 'Extracting assets...' : 'PDF uploaded successfully'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveFile}
                      className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Assets List */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-semibold text-text-primary">
                  Assets to be Acquired {uploadedFile && '(extracted from PDF)'}
                </label>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleAddAsset}
                >
                  + Add Asset
                </Button>
              </div>
              
              <div className="space-y-2">
                {assets.map((asset, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={asset}
                      onChange={(e) => handleAssetChange(index, e.target.value)}
                      placeholder={`Asset ${index + 1} (e.g., 2023 Honda Civic - VIN: 1HGBH41JXMN109186)`}
                    />
                    {assets.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveAsset(index)}
                        className="px-3 py-2 text-sm hover:bg-red-50 rounded text-red-600"
                        title="Remove asset"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                <span>{error}</span>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button type="submit" variant="primary" loading={loading}>
                Create Request
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate('/disbursements')}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

