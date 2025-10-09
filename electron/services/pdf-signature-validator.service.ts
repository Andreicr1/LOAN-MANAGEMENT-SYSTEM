import fs from 'fs'
import { app } from 'electron'
import path from 'path'

/**
 * PDF Signature Validator Service
 * Validates digital signatures in PDF documents
 */
export class PDFSignatureValidatorService {
  private uploadsPath: string

  constructor() {
    this.uploadsPath = path.join(app.getPath('userData'), 'uploads')
    if (!fs.existsSync(this.uploadsPath)) {
      fs.mkdirSync(this.uploadsPath, { recursive: true })
    }
  }

  /**
   * Save uploaded signed PDF
   */
  async saveUploadedPDF(base64Data: string, fileName: string): Promise<string> {
    try {
      // Remove data URL prefix if present
      const base64Clean = base64Data.replace(/^data:application\/pdf;base64,/, '')
      
      // Convert base64 to buffer
      const pdfBuffer = Buffer.from(base64Clean, 'base64')
      
      // Generate safe filename
      const safeFileName = fileName.replace(/[^a-z0-9.-]/gi, '_')
      const filePath = path.join(this.uploadsPath, safeFileName)
      
      // Save file
      fs.writeFileSync(filePath, pdfBuffer)
      
      return filePath
    } catch (error: any) {
      console.error('Error saving uploaded PDF:', error)
      throw new Error('Failed to save uploaded PDF')
    }
  }

  /**
   * Basic validation of PDF signature
   * Note: This is a simplified check. For production, use proper PDF signature validation library.
   */
  validateSignature(pdfPath: string): {
    isSigned: boolean
    signerName?: string
    signDate?: string
    certificateValid?: boolean
    error?: string
  } {
    try {
      if (!fs.existsSync(pdfPath)) {
        return { isSigned: false, error: 'PDF file not found' }
      }

      // Read PDF file
      const pdfBuffer = fs.readFileSync(pdfPath)
      const pdfContent = pdfBuffer.toString('utf-8', 0, Math.min(pdfBuffer.length, 100000))

      // Basic signature detection
      // Real PDFs with digital signatures contain these markers
      const hasSignature = pdfContent.includes('/Type /Sig') || 
                          pdfContent.includes('/SubFilter /adbe.pkcs7') ||
                          pdfContent.includes('/SubFilter /ETSI.CAdES') ||
                          pdfContent.includes('/ByteRange')

      if (!hasSignature) {
        return {
          isSigned: false,
          error: 'No digital signature detected in PDF'
        }
      }

      // Try to extract signer name (basic pattern matching)
      const signerMatch = pdfContent.match(/\/Name\s*\(([^)]+)\)/)
      const signerName = signerMatch ? signerMatch[1] : 'Unknown'

      // Try to extract sign date
      const dateMatch = pdfContent.match(/\/M\s*\(D:(\d{14})/)
      let signDate: string | undefined
      if (dateMatch) {
        const dateStr = dateMatch[1]
        signDate = `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`
      }

      return {
        isSigned: true,
        signerName,
        signDate,
        certificateValid: true, // For now, assume valid
      }
    } catch (error: any) {
      console.error('Error validating signature:', error)
      return {
        isSigned: false,
        error: 'Failed to validate signature: ' + error.message
      }
    }
  }

  /**
   * Get file size in bytes
   */
  getFileSize(filePath: string): number {
    try {
      const stats = fs.statSync(filePath)
      return stats.size
    } catch {
      return 0
    }
  }
}

