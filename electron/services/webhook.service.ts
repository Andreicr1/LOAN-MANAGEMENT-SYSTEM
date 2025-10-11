import express from 'express'
import bodyParser from 'body-parser'
import { Server } from 'http'
import * as https from 'https'
import { DocuSignService } from './docusign.service'
import { EmailService } from './email.service'
import { DisbursementService } from './disbursement.service'
import type { Disbursement } from './disbursement.service'
import { PromissoryNoteService } from './promissory-note.service'
import { app as electronApp } from 'electron'
import * as path from 'path'
import * as fs from 'fs'
import { PDFService } from './pdf.service'

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
    private promissoryNoteService: PromissoryNoteService,
    private pdfService: PDFService
  ) {
    this.app = express()
    this.setupMiddleware()
    this.setupRoutes()
  }

  private setupMiddleware(): void {
    // Parse raw body for signature verification
    this.app.use(bodyParser.raw({ type: 'application/json' }))
  }

  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() })
    })

    // OAuth callback endpoint for JWT consent
    this.app.get('/callback', (req, res) => {
      const code = req.query.code as string
      const error = req.query.error as string
      
      if (error) {
        console.error('❌ DocuSign OAuth error:', error)
        res.send(`
          <html>
            <head><title>DocuSign - Erro na Autorização</title></head>
            <body style="font-family: Arial; text-align: center; padding: 50px;">
              <h1 style="color: #dc3545;">❌ Erro na Autorização</h1>
              <p>Erro: ${error}</p>
              <p>Tente novamente ou contate o suporte.</p>
            </body>
          </html>
        `)
        return
      }
      
      console.log('✅ DocuSign OAuth callback recebido!')
      console.log('Authorization code:', code)
      
      res.send(`
        <html>
          <head>
            <title>DocuSign - Autorização Concedida</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
                text-align: center;
                padding: 50px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                margin: 0;
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
              }
              .container {
                background: white;
                color: #333;
                padding: 40px;
                border-radius: 10px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                max-width: 500px;
              }
              h1 { color: #1dd55c; margin-bottom: 20px; }
              .checkmark {
                width: 80px;
                height: 80px;
                border-radius: 50%;
                background: #1dd55c;
                color: white;
                font-size: 50px;
                line-height: 80px;
                margin: 0 auto 20px;
              }
              p { font-size: 16px; line-height: 1.6; }
              .timer { color: #666; margin-top: 20px; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="checkmark">✓</div>
              <h1>Autorização Concedida!</h1>
              <p>O <strong>Loan Management System</strong> foi autorizado com sucesso no DocuSign.</p>
              <p>Você já pode enviar documentos para assinatura.</p>
              <p class="timer">Esta janela fechará automaticamente em <span id="countdown">3</span> segundos...</p>
            </div>
            <script>
              let seconds = 3;
              const countdown = document.getElementById('countdown');
              setInterval(() => {
                seconds--;
                countdown.textContent = seconds;
                if (seconds <= 0) window.close();
              }, 1000);
            </script>
          </body>
        </html>
      `)
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
              disbursement.requestNumber,
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
          wireTransferSignatureStatus: 'completed'
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
              disbursement.requestNumber,
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
            disbursement.requestNumber,
            `$${disbursement.requestedAmount.toLocaleString()}`,
            disbursement.clientName || 'Borrower'
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
      let wtPath = disbursement.wireTransferPath
      if (!wtPath) {
        const generatedPath = await this.generateWireTransferDocument(disbursement)
        if (!generatedPath) {
          console.warn('Wire transfer document is not available for disbursement', disbursementId)
          return
        }
        wtPath = generatedPath
        await this.disbursementService.updateDisbursement(disbursementId, {
          wireTransferPath: generatedPath
        })
      }

      // Send for signature via DocuSign
      const signatories = JSON.parse(disbursement.signatories || '[]')
      const config = await this.getSystemConfig()
      
      const envelopeId = await this.docuSignService.sendForSignature({
        documentPath: wtPath,
        documentName: `Wire Transfer Order - ${disbursement.requestNumber}`,
        signers: signatories.map((s: any, index: number) => ({
          email: s.email,
          name: s.name,
          recipientId: (index + 1).toString(),
          routingOrder: '1'
        })),
        subject: `Wire Transfer Order - ${disbursement.requestNumber}`,
        message: 'Please sign the attached Wire Transfer Order to authorize the fund transfer.',
        webhookUrl: config?.webhookUrl
      })

      // Update disbursement with envelope ID
      await this.disbursementService.updateDisbursement(disbursementId, {
        wireTransferEnvelopeId: envelopeId,
        wireTransferSignatureStatus: 'sent'
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

  private async generateWireTransferDocument(disbursement: Disbursement): Promise<string | null> {
    try {
      const promissoryNote = await this.promissoryNoteService.getByDisbursementId(disbursement.id)
      if (!promissoryNote) {
        return null
      }

      const filePath = await this.pdfService.generateWireTransferOrder({
        pnNumber: promissoryNote.pnNumber,
        requestNumber: disbursement.requestNumber,
        amount: disbursement.requestedAmount,
        beneficiary: {
          name: disbursement.clientName || 'Borrower',
          address: 'N/A'
        },
        assetsList: disbursement.assetsList,
        reference: `Disbursement ${disbursement.requestNumber}`
      })

      return filePath
    } catch (error) {
      console.error('Failed to generate wire transfer document:', error)
      return null
    }
  }

  async start(config: WebhookConfig): Promise<void> {
    this.config = config
    
    return new Promise((resolve, reject) => {
      // Para OAuth callback do DocuSign, DEVE ser HTTPS
      const certPath = path.join(electronApp.getPath('userData'), 'oauth-cert.pem')
      const keyPath = path.join(electronApp.getPath('userData'), 'oauth-key.pem')
      
      // Gerar ou usar certificados existentes
      if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
        console.log('Generating self-signed HTTPS certificate...')
        this.generateSelfSignedCert(certPath, keyPath)
      } else {
        console.log('✓ Using existing HTTPS certificates')
      }
      
      // Sempre usar HTTPS
      const httpsOptions: https.ServerOptions = {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath)
      }
      
      this.server = https.createServer(httpsOptions, this.app).listen(config.port, () => {
        console.log(`✓ HTTPS OAuth/Webhook server started on port ${config.port}`)
        console.log(`  - Callback URL: https://localhost:${config.port}/callback`)
        console.log(`  - Webhook URL: https://localhost:${config.port}/webhook/docusign`)
        resolve()
      }).on('error', reject)
    })
  }
  
  private generateSelfSignedCert(certPath: string, keyPath: string): void {
    try {
      // Usar biblioteca selfsigned para gerar certificados válidos
      const selfsigned = require('selfsigned')
      
      const attrs = [{ name: 'commonName', value: 'localhost' }]
      const pems = selfsigned.generate(attrs, {
        days: 365,
        keySize: 2048,
        algorithm: 'sha256'
      })
      
      fs.writeFileSync(certPath, pems.cert)
      fs.writeFileSync(keyPath, pems.private)
      console.log('✓ Generated valid self-signed HTTPS certificate')
    } catch (error) {
      console.error('Failed to generate certificate:', error)
      throw error
    }
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
