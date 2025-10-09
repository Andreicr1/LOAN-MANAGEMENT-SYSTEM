import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useAuthStore } from '@/stores/authStore'
import { formatMoney, formatDate, formatDateTime } from '@/lib/utils'

interface DisbursementDetail {
  id: number
  requestNumber: string
  clientId: number
  clientName?: string
  requestedAmount: number
  requestDate: string
  status: string
  assetsList?: string[]
  description?: string
  approvedBy?: number
  approvedAt?: string
  approverName?: string
  createdAt: string
  signatories?: string
}

export const DisbursementDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const currentUser = useAuthStore((state) => state.user)
  
  const [disbursement, setDisbursement] = useState<DisbursementDetail | null>(null)
  const [promissoryNote, setPromissoryNote] = useState<any>(null)
  const [config, setConfig] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [generatingPN, setGeneratingPN] = useState(false)
  const [uploadingSignedPN, setUploadingSignedPN] = useState(false)
  const [signatureInfo, setSignatureInfo] = useState<any>(null)

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const loadData = async () => {
    setLoading(true)
    try {
      const [disbData, pnData, configData] = await Promise.all([
        window.electronAPI.disbursements.getById(parseInt(id!)),
        window.electronAPI.promissoryNotes.getByDisbursementId(parseInt(id!)),
        window.electronAPI.config.get(),
      ])
      
      console.log('Loaded data:', { disbData, pnData, configData })
      setDisbursement(disbData)
      setPromissoryNote(pnData)
      setConfig(configData)
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async () => {
    if (!confirm('Approve this disbursement and generate Promissory Note?')) return

    try {
      // Approve disbursement
      const approveResult = await window.electronAPI.disbursements.approve(
        parseInt(id!),
        currentUser!.id
      )

      if (!approveResult.success) {
        alert(approveResult.error)
        return
      }

      // Generate Promissory Note
      await generatePromissoryNote()
      
      await window.electronAPI.audit.log(currentUser!.id, 'DISBURSEMENT_APPROVED', {
        disbursementId: parseInt(id!),
        requestNumber: disbursement?.requestNumber,
      })

      loadData()
    } catch (error) {
      alert('Failed to approve disbursement')
    }
  }

  const generatePromissoryNote = async () => {
    if (!disbursement || !config) return

    // Validate config before starting
    if (!config.lender?.address || config.lender.address.trim() === '') {
      alert('Lender address is not configured. Please go to Settings and fill in the Lender address.')
      return
    }
    if (!config.borrower?.address || config.borrower.address.trim() === '') {
      alert('Borrower address is not configured. Please go to Settings and fill in the Borrower address.')
      return
    }

    setGeneratingPN(true)

    try {
      // Create PN in database
      const dueDate = new Date(disbursement.requestDate)
      dueDate.setDate(dueDate.getDate() + config.defaultDueDays)

      console.log('Creating PN in database...')
      const createResult = await window.electronAPI.promissoryNotes.create({
        disbursementId: disbursement.id,
        principalAmount: disbursement.requestedAmount,
        interestRate: config.interestRateAnnual,
        issueDate: disbursement.requestDate,
        dueDate: dueDate.toISOString().split('T')[0],
      })

      if (!createResult.success) {
        alert(createResult.error)
        return
      }

      console.log('PN created in database:', createResult.pnNumber)

      // Generate PDF
      const pdfData = {
        pnNumber: createResult.pnNumber,
        principalAmount: disbursement.requestedAmount,
        interestRate: config.interestRateAnnual,
        issueDate: disbursement.requestDate,
        dueDate: dueDate.toISOString().split('T')[0],
        requestNumber: disbursement.requestNumber,
        assetsList: disbursement.assetsList,
        lender: config.lender,
        borrower: config.borrower,
      }

      console.log('Generating PDF with data:', pdfData)
      
      const pdfPath = await window.electronAPI.pdf.generatePromissoryNote(pdfData)
      
      console.log('PDF generated at:', pdfPath)

      // Update PN with PDF path
      await window.electronAPI.promissoryNotes.update(createResult.promissoryNoteId, {
        generatedPnPath: pdfPath,
      })

      await window.electronAPI.audit.log(currentUser!.id, 'PROMISSORY_NOTE_GENERATED', {
        pnNumber: createResult.pnNumber,
        disbursementId: disbursement.id,
      })

      // Send for signature via DocuSign
      console.log('Sending PN for DocuSign signature...')
      
      const signatories = disbursement.signatories ? JSON.parse(disbursement.signatories) : []
      
      if (signatories.length > 0) {
        const sendResult = await window.electronAPI.docusign.sendPromissoryNoteForSignature({
          promissoryNoteId: createResult.promissoryNoteId,
          pdfPath: pdfPath,
          pnNumber: createResult.pnNumber,
          disbursementNumber: disbursement.requestNumber,
          signatories: signatories
        })
        
        if (sendResult.success) {
          alert(`Promissory Note ${createResult.pnNumber} generated and sent for signature!`)
        } else {
          alert(`Promissory Note ${createResult.pnNumber} generated successfully!\n\nNote: Failed to send for signature: ${sendResult.error}`)
        }
      } else {
        alert(`Promissory Note ${createResult.pnNumber} generated successfully!\n\nNote: No signatories configured for automatic signature.`)
      }
      
      loadData()
    } catch (error: any) {
      console.error('Failed to generate PN:', error)
      const errorMessage = error?.message || 'Failed to generate Promissory Note'
      alert(errorMessage)
    } finally {
      setGeneratingPN(false)
    }
  }

  const generateWireTransfer = async () => {
    if (!disbursement || !promissoryNote || !config) return

    try {
      const wtData = {
        pnNumber: promissoryNote.pn_number,
        requestNumber: disbursement.requestNumber,
        amount: disbursement.requestedAmount,
        beneficiary: {
          name: config.borrower.name,
          address: config.borrower.address,
        },
        assetsList: disbursement.assetsList,
        reference: `${promissoryNote.pn_number} | ${disbursement.requestNumber} | ${
          disbursement.assetsList ? disbursement.assetsList.slice(0, 2).join(', ') : 'Disbursement'
        }`,
      }

      const pdfPath = await window.electronAPI.pdf.generateWireTransfer(wtData)

      await window.electronAPI.audit.log(currentUser!.id, 'WIRE_TRANSFER_GENERATED', {
        pnNumber: promissoryNote.pn_number,
        amount: disbursement.requestedAmount,
      })

      // Send for signature via DocuSign
      console.log('Sending Wire Transfer for DocuSign signature...')
      
      const signatories = disbursement.signatories ? JSON.parse(disbursement.signatories) : []
      
      if (signatories.length > 0) {
        const sendResult = await window.electronAPI.docusign.sendWireTransferForSignature({
          disbursementId: disbursement.id,
          pdfPath: pdfPath,
          disbursementNumber: disbursement.requestNumber,
          signatories: signatories
        })
        
        if (sendResult.success) {
          alert('Wire Transfer Order generated and sent for signature!')
        } else {
          await window.electronAPI.openPDF(pdfPath)
          alert(`Wire Transfer Order generated successfully!\n\nNote: Failed to send for signature: ${sendResult.error}`)
        }
      } else {
        await window.electronAPI.openPDF(pdfPath)
        alert('Wire Transfer Order generated successfully!\n\nNote: No signatories configured for automatic signature.')
      }
    } catch (error) {
      alert('Failed to generate Wire Transfer Order')
    }
  }

  const openGeneratedPN = async () => {
    if (promissoryNote?.generated_pn_path) {
      await window.electronAPI.openPDF(promissoryNote.generated_pn_path)
    }
  }

  const openSignedPN = async () => {
    if (promissoryNote?.signed_pn_path) {
      await window.electronAPI.openPDF(promissoryNote.signed_pn_path)
    }
  }

  const handleUploadSignedPN = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.type !== 'application/pdf') {
      alert('Please upload a PDF file')
      return
    }

    if (!promissoryNote?.id) {
      alert('Promissory Note ID not found')
      return
    }

    setUploadingSignedPN(true)

    try {
      // Read file as base64
      const reader = new FileReader()
      reader.onload = async (event) => {
        const base64 = event.target?.result as string
        
        // Upload and validate signature
        const result = await window.electronAPI.uploadSignedPN(
          promissoryNote.id,
          base64,
          `${promissoryNote.pn_number}_Signed.pdf`
        )
        
        if (result.success) {
          setSignatureInfo(result.signatureInfo)
          alert(`Signed PN uploaded successfully!${
            result.signatureInfo?.signerName 
              ? `\n\nSigner: ${result.signatureInfo.signerName}` 
              : ''
          }${
            result.signatureInfo?.signDate 
              ? `\nSigned on: ${result.signatureInfo.signDate}` 
              : ''
          }`)
          
          await window.electronAPI.audit.log(currentUser!.id, 'SIGNED_PN_UPLOADED', {
            pnNumber: promissoryNote.pn_number,
            signerName: result.signatureInfo?.signerName
          })
          
          loadData()
        } else {
          alert(`Failed to upload signed PN:\n\n${result.error}`)
        }
        
        setUploadingSignedPN(false)
      }
      
      reader.onerror = () => {
        alert('Error reading file')
        setUploadingSignedPN(false)
      }
      
      reader.readAsDataURL(file)
    } catch (error) {
      alert('Error uploading file')
      setUploadingSignedPN(false)
    }
  }

  if (loading || !disbursement) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-text-primary">Loading...</h1>
      </div>
    )
  }

  const canApprove = currentUser?.role === 'admin' && disbursement.status === 'Pending'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/disbursements')}
          >
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-text-primary">{disbursement.requestNumber}</h1>
            <p className="text-text-secondary mt-1">Disbursement Request Details</p>
          </div>
        </div>
        
        {canApprove && (
          <Button onClick={handleApprove}>
            Approve & Generate PN
          </Button>
        )}
      </div>

      {/* Status & Amount */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-text-secondary font-medium">Status</p>
            <Badge variant={disbursement.status.toLowerCase() as any} className="mt-2">
              {disbursement.status}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-text-secondary font-medium">Requested Amount</p>
            <p className="text-2xl font-bold text-text-primary mt-2">
              {formatMoney(disbursement.requestedAmount)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-text-secondary font-medium">Request Date</p>
            <p className="text-lg font-semibold text-text-primary mt-2">
              {formatDate(disbursement.requestDate)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Details */}
      <Card>
        <CardHeader>
          <CardTitle>Request Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {disbursement.clientName && (
              <div>
                <p className="text-sm font-semibold text-text-primary">Client:</p>
                <p className="text-sm text-text-secondary mt-1">{disbursement.clientName}</p>
              </div>
            )}

            {disbursement.description && (
              <div>
                <p className="text-sm font-semibold text-text-primary">Description:</p>
                <p className="text-sm text-text-secondary mt-1">{disbursement.description}</p>
              </div>
            )}

            {disbursement.assetsList && disbursement.assetsList.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-text-primary mb-2">Assets to be Acquired:</p>
                <ul className="list-disc list-inside space-y-1">
                  {disbursement.assetsList.map((asset, index) => (
                    <li key={index} className="text-sm text-text-secondary">{asset}</li>
                  ))}
                </ul>
              </div>
            )}

            {disbursement.approvedBy && (
              <div>
                <p className="text-sm font-semibold text-text-primary">Approved By:</p>
                <p className="text-sm text-text-secondary mt-1">
                  {disbursement.approverName} on {disbursement.approvedAt ? formatDateTime(disbursement.approvedAt) : 'N/A'}
                </p>
              </div>
            )}

            <div>
              <p className="text-sm font-semibold text-text-primary">Created:</p>
              <p className="text-sm text-text-secondary mt-1">{formatDateTime(disbursement.createdAt)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Promissory Note */}
      {promissoryNote && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Promissory Note</CardTitle>
              <Button
                variant="secondary"
                size="sm"
                onClick={generateWireTransfer}
                disabled={!promissoryNote.signed_pn_path}
              >
                Generate Wire Transfer Order
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-sm font-semibold text-text-primary">PN Number:</p>
                <p className="text-sm text-text-secondary mt-1">{promissoryNote.pn_number || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-text-primary">Principal Amount:</p>
                <p className="text-sm text-text-secondary mt-1">
                  {promissoryNote.principal_amount ? formatMoney(promissoryNote.principal_amount) : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold text-text-primary">Interest Rate:</p>
                <p className="text-sm text-text-secondary mt-1">
                  {promissoryNote.interest_rate ? `${promissoryNote.interest_rate}% per annum` : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold text-text-primary">Due Date:</p>
                <p className="text-sm text-text-secondary mt-1">
                  {promissoryNote.due_date ? formatDate(promissoryNote.due_date) : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold text-text-primary">Status:</p>
                <Badge variant={promissoryNote.status?.toLowerCase() || 'pending'} className="mt-1">
                  {promissoryNote.status || 'Unknown'}
                </Badge>
              </div>
            </div>

            {/* PDF Documents */}
            <div className="pt-4 border-t border-border-gray">
              <p className="text-sm font-semibold text-text-primary mb-3">Documents:</p>
              <div className="flex flex-wrap gap-2">
                {promissoryNote.generated_pn_path && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={openGeneratedPN}
                  >
                    View Generated PN
                  </Button>
                )}
                {promissoryNote.signed_pn_path && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={openSignedPN}
                  >
                    View Signed PN
                  </Button>
                )}
                {!promissoryNote.generated_pn_path && !promissoryNote.signed_pn_path && (
                  <p className="text-sm text-text-secondary">No documents available yet</p>
                )}
              </div>
            </div>

            {/* Wire Transfer Status */}
            {!promissoryNote.signed_pn_path && (
              <div className="mt-4 pt-4 border-t border-border-gray">
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800 font-medium">
                    ⚠️ Wire Transfer Order requires signed Promissory Note
                  </p>
                  <p className="text-xs text-yellow-700 mt-1">
                    Upload the electronically signed PN below to enable Wire Transfer generation.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Upload Signed PN */}
      {promissoryNote && !promissoryNote.signed_pn_path && (
        <Card className="border-green-primary/50">
          <CardHeader>
            <CardTitle>Upload Signed Promissory Note</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-text-secondary">
                Upload the Promissory Note with certified electronic signature from Whole Max.
                The system will validate the digital signature before allowing Wire Transfer generation.
              </p>

              <div className="border-2 border-dashed border-green-primary rounded-lg p-6 text-center bg-green-subtle/30">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleUploadSignedPN}
                  className="hidden"
                  id="signed-pn-upload"
                  disabled={uploadingSignedPN}
                />
                <label
                  htmlFor="signed-pn-upload"
                  className={`cursor-pointer inline-flex flex-col items-center ${
                    uploadingSignedPN ? 'opacity-50' : ''
                  }`}
                >
                  <div className="w-16 h-16 bg-green-primary rounded-lg flex items-center justify-center mb-3">
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-text-primary">
                    {uploadingSignedPN ? 'Uploading and validating...' : 'Click to upload signed PDF'}
                  </span>
                  <span className="text-xs text-text-secondary mt-1">
                    PDF must contain valid electronic signature
                  </span>
                </label>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm font-semibold text-blue-800 mb-2">Signature Requirements:</p>
                <ul className="text-xs text-blue-700 space-y-1">
                  <li>✓ PDF must be electronically signed (certified signature)</li>
                  <li>✓ Signer must be authorized representative of Whole Max</li>
                  <li>✓ Signature must be valid and not expired</li>
                  <li>✓ Document integrity must be intact</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {disbursement.status === 'Approved' && !promissoryNote && (
        <Card>
          <CardContent className="py-8 text-center">
            <div className="w-16 h-16 bg-green-subtle rounded-lg flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl text-green-primary font-bold">PN</span>
            </div>
            <p className="text-text-secondary mb-4">Promissory Note not yet generated</p>
            <Button onClick={generatePromissoryNote} loading={generatingPN}>
              Generate Promissory Note
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

