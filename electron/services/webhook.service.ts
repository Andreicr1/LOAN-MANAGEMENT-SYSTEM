import * as express from 'express'
import * as bodyParser from 'body-parser'
import { Server } from 'http'
import { DocuSignService } from './docusign.service'
import { EmailService } from './email.service'
import { DisbursementService } from './disbursement.service'
import { PromissoryNoteService } from './promissory-note.service'
import { app as electronApp } from 'electron'
import * as path from 'path'
import * as fs from 'fs'

export interface WebhookConfig {
  port: number
  path: string
  secret: string
}

export class WebhookService {
  private app: express.Application
  private server: Server | null = null
  private config: WebhookConfig | null = null
  
  constructor(
    private docuSignService: DocuSignService,
    private emailService: EmailService,
    private disbursementService: DisbursementService,
    private promissoryNoteService: PromissoryNoteService
  ) {
    const expressApp = express as any
    this.app = expressApp()
    this.setupMiddleware()
    this.setupRoutes()
  }

  private setupMiddleware(): void {
    // Parse raw body for signature verification
    const bodyParserModule = bodyParser as any
    this.app.use(bodyParserModule.raw({ type: 'application/json' }))
  }

  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() })
    })

    // DocuSign webhook endpoint
    this.app.post('/webhook/docusign', async (req, res) => {
      try {
        // Get signature from headers
        const signature = req.headers['x-docusign-signature-1'] as string
        const payload = req.body.toString()

        // Verify signature
        if (this.config && !this.docuSignService.verifyWebhookSignature(
          signature,
          payload,
          this.config.secret
        )) {
          console.error('Invalid webhook signature')
          return res.status(401).send('Unauthorized')
        }

        // Parse the payload
        const data = JSON.parse(payload)
        const notification = this.docuSignService.processWebhookNotification(data)

        console.log('DocuSign webhook received:', notification)

        // Process based on status
        await this.processDocuSignNotification(notification)

        res.status(200).send('OK')
      } catch (error) {
        console.error('Webhook processing error:', error)
        res.status(500).send('Internal Server Error')
      }
    })
  }

  private async processDocuSignNotification(notification: any): Promise<void> {
    const { envelopeId, status, completedDate } = notification

    // Find the related document
    const pnInfo = await this.findPromissoryNoteByEnvelopeId(envelopeId)
    const wtInfo = await this.findWireTransferByEnvelopeId(envelopeId)

    if (pnInfo) {
      await this.handlePromissoryNoteUpdate(pnInfo, status, completedDate, envelopeId)
    } else if (wtInfo) {
      await this.handleWireTransferUpdate(wtInfo, status, completedDate, envelopeId)
    } else {
      console.warn('No document found for envelope:', envelopeId)
    }
  }

  private async handlePromissoryNoteUpdate(
    pnInfo: any,
    status: string,
    completedDate: string,
    envelopeId: string
  ): Promise<void> {
    const { promissoryNoteId, disbursementId } = pnInfo

    if (status === 'completed') {
      try {
        // Download signed document
        const signedPdf = await this.docuSignService.downloadSignedDocument(envelopeId)
        
        // Save signed document
        const signedPath = path.join(
          electronApp.getPath('userData'),
          'signed_documents',
          `PN_${disbursementId}_signed.pdf`
        )
        
        // Ensure directory exists
        const dir = path.dirname(signedPath)
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true })
        }
        
        fs.writeFileSync(signedPath, signedPdf)

        // Update promissory note record
        await this.promissoryNoteService.updatePromissoryNote(promissoryNoteId, {
          signedPnPath: signedPath,
          signatureDate: completedDate,
          signatureStatus: 'completed'
        })

        // Get disbursement info
        const disbursement = await this.disbursementService.getDisbursementById(disbursementId)

        // Send confirmation email
        if (disbursement?.signatories) {
          const signatories = JSON.parse(disbursement.signatories)
          for (const signatory of signatories) {
            await this.emailService.sendSignatureConfirmation(
              signatory.email,
              'PN',
              disbursement.disbursement_number,
              signatory.name,
              new Date(completedDate).toLocaleDateString()
            )
          }
        }

        // Automatically send Wire Transfer for signature
        await this.sendWireTransferForSignature(disbursementId)
        
      } catch (error) {
        console.error('Error handling PN signature completion:', error)
      }
    }
  }

  private async handleWireTransferUpdate(
    wtInfo: any,
    status: string,
    completedDate: string,
    envelopeId: string
  ): Promise<void> {
    const { disbursementId } = wtInfo

    if (status === 'completed') {
      try {
        // Download signed document
        const signedPdf = await this.docuSignService.downloadSignedDocument(envelopeId)
        
        // Save signed document
        const signedPath = path.join(
          electronApp.getPath('userData'),
          'signed_documents',
          `WT_${disbursementId}_signed.pdf`
        )
        
        // Ensure directory exists
        const dir = path.dirname(signedPath)
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true })
        }
        
        fs.writeFileSync(signedPath, signedPdf)

        // Update disbursement record
        await this.disbursementService.updateDisbursement(disbursementId, {
          wireTransferSignedPath: signedPath,
          wireTransferSignatureDate: completedDate,
          wireTransferStatus: 'completed'
        })

        // Get disbursement info
        const disbursement = await this.disbursementService.getDisbursementById(disbursementId)

        // Send confirmation emails
        if (disbursement?.signatories) {
          const signatories = JSON.parse(disbursement.signatories)
          for (const signatory of signatories) {
            await this.emailService.sendSignatureConfirmation(
              signatory.email,
              'WT',
              disbursement.disbursement_number,
              signatory.name,
              new Date(completedDate).toLocaleDateString()
            )
          }
        }

        // Automatically send to bank
        const config = await this.getSystemConfig()
        if (config?.bankEmail && disbursement) {
          await this.emailService.sendWireTransferToBank(
            config.bankEmail,
            signedPath,
            disbursement.disbursement_number,
            `$${disbursement.total_loan_amount.toLocaleString()}`,
            disbursement.borrower_name
          )

          // Update status
          await this.disbursementService.updateDisbursement(disbursementId, {
            bankEmailSentDate: new Date().toISOString(),
            status: 'bank_notified'
          })
        }
        
      } catch (error) {
        console.error('Error handling WT signature completion:', error)
      }
    }
  }

  private async sendWireTransferForSignature(disbursementId: number): Promise<void> {
    try {
      const disbursement = await this.disbursementService.getDisbursementById(disbursementId)
      if (!disbursement) return

      // Generate Wire Transfer if not exists
      let wtPath = disbursement.wire_transfer_path
      if (!wtPath) {
        const result = await this.disbursementService.generateWireTransferOrder(disbursementId)
        if (!result.success || !result.filePath) {
          throw new Error('Failed to generate Wire Transfer')
        }
        wtPath = result.filePath
      }

      // Send for signature via DocuSign
      const signatories = JSON.parse(disbursement.signatories || '[]')
      const config = await this.getSystemConfig()
      
      const envelopeId = await this.docuSignService.sendForSignature({
        documentPath: wtPath,
        documentName: `Wire Transfer Order - ${disbursement.disbursement_number}`,
        signers: signatories.map((s: any, index: number) => ({
          email: s.email,
          name: s.name,
          recipientId: (index + 1).toString(),
          routingOrder: '1'
        })),
        subject: `Wire Transfer Order - ${disbursement.disbursement_number}`,
        message: 'Please sign the attached Wire Transfer Order to authorize the fund transfer.',
        webhookUrl: config?.webhookUrl
      })

      // Update disbursement with envelope ID
      await this.disbursementService.updateDisbursement(disbursementId, {
        wireTransferEnvelopeId: envelopeId,
        wireTransferStatus: 'sent'
      })

      // Send email notifications
      for (const signatory of signatories) {
        // For simplicity, using direct DocuSign email
        // In production, you might want to use embedded signing
      }

    } catch (error) {
      console.error('Error sending Wire Transfer for signature:', error)
    }
  }

  private async findPromissoryNoteByEnvelopeId(envelopeId: string): Promise<any> {
    // This would query your database
    // For now, returning a placeholder
    return null
  }

  private async findWireTransferByEnvelopeId(envelopeId: string): Promise<any> {
    // This would query your database
    // For now, returning a placeholder
    return null
  }

  private async getSystemConfig(): Promise<any> {
    // This would get system configuration
    // For now, returning a placeholder
    return null
  }

  async start(config: WebhookConfig): Promise<void> {
    this.config = config
    
    return new Promise((resolve, reject) => {
      this.server = this.app.listen(config.port, () => {
        console.log(`Webhook server listening on port ${config.port}`)
        resolve()
      }).on('error', reject)
    })
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log('Webhook server stopped')
          resolve()
        })
      } else {
        resolve()
      }
    })
  }
}
