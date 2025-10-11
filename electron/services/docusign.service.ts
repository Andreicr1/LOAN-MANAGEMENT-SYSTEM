import { app } from 'electron'
import * as docusign from 'docusign-esign'
import * as path from 'path'
import * as fs from 'fs'
import * as crypto from 'crypto'

export interface DocuSignConfig {
  integrationKey: string
  secretKey: string
  userId: string
  redirectUri: string
  basePath: string
  accountId: string
  operationsEmail: string
  bankEmail: string
}

export interface SignatureRequest {
  documentPath: string
  documentName: string
  signers: Array<{
    email: string
    name: string
    clientUserId?: string
    recipientId: string
    routingOrder: string
  }>
  subject: string
  message: string
  webhookUrl?: string
}

export class DocuSignService {
  private apiClient: any
  private config: DocuSignConfig | null = null
  private accessToken: string | null = null
  private tokenExpiration: number = 0

  constructor() {
    this.apiClient = new docusign.ApiClient()
  }

  async initialize(config: DocuSignConfig): Promise<void> {
    this.config = config
    this.apiClient.setBasePath(config.basePath)
    await this.refreshAccessToken()
  }

  private async refreshAccessToken(): Promise<void> {
    if (!this.config) throw new Error('DocuSign not configured')
    
    const now = Date.now()
    if (this.accessToken && this.tokenExpiration > now) {
      return
    }

    try {
      // JWT Authentication
      const privateKey = fs.readFileSync(
        path.join(app.getPath('userData'), 'docusign-private-key.pem'),
        'utf-8'
      )

      const jwtLifeSec = 3600 // 1 hour
      const results = await this.apiClient.requestJWTUserToken(
        this.config.integrationKey,
        this.config.userId,
        ['signature', 'impersonation'],
        privateKey,
        jwtLifeSec
      )

      this.accessToken = results.body.access_token
      this.tokenExpiration = now + (jwtLifeSec * 1000)
      this.apiClient.addDefaultHeader('Authorization', `Bearer ${this.accessToken}`)
    } catch (error) {
      console.error('Failed to get DocuSign access token:', error)
      throw error
    }
  }

  async sendForSignature(request: SignatureRequest): Promise<string> {
    if (!this.config) throw new Error('DocuSign not configured')
    
    await this.refreshAccessToken()

    const envelopesApi = new docusign.EnvelopesApi(this.apiClient)
    
    // Read document
    const documentBase64 = fs.readFileSync(request.documentPath).toString('base64')
    
    // Create document
    const document = docusign.Document.constructFromObject({
      documentBase64: documentBase64,
      name: request.documentName,
      fileExtension: 'pdf',
      documentId: '1'
    })

    // Create signers
    const signers = request.signers.map(signer => 
      docusign.Signer.constructFromObject({
        email: signer.email,
        name: signer.name,
        clientUserId: signer.clientUserId,
        recipientId: signer.recipientId,
        routingOrder: signer.routingOrder,
        tabs: {
          signHereTabs: [{
            anchorString: '/sn1/',
            anchorUnits: 'pixels',
            anchorXOffset: '20',
            anchorYOffset: '10'
          }],
          dateSignedTabs: [{
            anchorString: '/ds1/',
            anchorUnits: 'pixels',
            anchorXOffset: '20',
            anchorYOffset: '10'
          }]
        }
      })
    )

    // Create recipients
    const recipients = docusign.Recipients.constructFromObject({
      signers: signers
    })

    // Create envelope definition
    const envelopeDefinition = docusign.EnvelopeDefinition.constructFromObject({
      emailSubject: request.subject,
      emailBlurb: request.message,
      documents: [document],
      recipients: recipients,
      status: 'sent',
      eventNotification: request.webhookUrl ? {
        url: request.webhookUrl,
        loggingEnabled: true,
        requireAcknowledgment: true,
        includeDocuments: false,
        includeEnvelopeVoidReason: true,
        includeTimeZone: true,
        includeSenderAccountAsCustomField: true,
        includeDocumentFields: true,
        includeCertificateOfCompletion: false,
        envelopeEvents: [
          { envelopeEventStatusCode: 'sent' },
          { envelopeEventStatusCode: 'delivered' },
          { envelopeEventStatusCode: 'completed' },
          { envelopeEventStatusCode: 'declined' },
          { envelopeEventStatusCode: 'voided' }
        ],
        recipientEvents: [
          { recipientEventStatusCode: 'Sent' },
          { recipientEventStatusCode: 'Delivered' },
          { recipientEventStatusCode: 'Completed' },
          { recipientEventStatusCode: 'Declined' }
        ]
      } : undefined
    })

    try {
      const results = await envelopesApi.createEnvelope(
        this.config.accountId,
        { envelopeDefinition }
      )
      
      return results.envelopeId
    } catch (error) {
      console.error('Failed to send document for signature:', error)
      throw error
    }
  }

  async getEnvelopeStatus(envelopeId: string): Promise<string> {
    if (!this.config) throw new Error('DocuSign not configured')
    
    await this.refreshAccessToken()

    const envelopesApi = new docusign.EnvelopesApi(this.apiClient)
    
    try {
      const envelope = await envelopesApi.getEnvelope(
        this.config.accountId,
        envelopeId
      )
      
      return envelope.status
    } catch (error) {
      console.error('Failed to get envelope status:', error)
      throw error
    }
  }

  async downloadSignedDocument(envelopeId: string, documentId: string = '1'): Promise<Buffer> {
    if (!this.config) throw new Error('DocuSign not configured')
    
    await this.refreshAccessToken()

    const envelopesApi = new docusign.EnvelopesApi(this.apiClient)
    
    try {
      const results = await envelopesApi.getDocument(
        this.config.accountId,
        envelopeId,
        documentId
      )
      
      return results
    } catch (error) {
      console.error('Failed to download signed document:', error)
      throw error
    }
  }

  async createEmbeddedSigningUrl(
    envelopeId: string,
    signerEmail: string,
    signerName: string,
    clientUserId: string,
    returnUrl: string
  ): Promise<string> {
    if (!this.config) throw new Error('DocuSign not configured')
    
    await this.refreshAccessToken()

    const envelopesApi = new docusign.EnvelopesApi(this.apiClient)
    
    const viewRequest = docusign.RecipientViewRequest.constructFromObject({
      authenticationMethod: 'None',
      clientUserId: clientUserId,
      recipientId: '1',
      returnUrl: returnUrl,
      userName: signerName,
      email: signerEmail
    })

    try {
      const results = await envelopesApi.createRecipientView(
        this.config.accountId,
        envelopeId,
        { recipientViewRequest: viewRequest }
      )
      
      return results.url
    } catch (error) {
      console.error('Failed to create embedded signing URL:', error)
      throw error
    }
  }

  // Process webhook notification from DocuSign
  processWebhookNotification(body: any): {
    envelopeId: string
    status: string
    completedDate?: string
    recipientEvents?: Array<{
      email: string
      status: string
      signedDateTime?: string
    }>
  } {
    const envelopeStatus = body.envelopeStatus || body
    
    const result = {
      envelopeId: envelopeStatus.envelopeId,
      status: envelopeStatus.status,
      completedDate: envelopeStatus.completedDateTime,
      recipientEvents: []
    }

    if (envelopeStatus.recipients && envelopeStatus.recipients.signers) {
      result.recipientEvents = envelopeStatus.recipients.signers.map((signer: any) => ({
        email: signer.email,
        status: signer.status,
        signedDateTime: signer.signedDateTime
      }))
    }

    return result
  }

  // Verify webhook signature
  verifyWebhookSignature(
    signature: string,
    payload: string,
    secret: string
  ): boolean {
    const hmac = crypto.createHmac('sha256', secret)
    hmac.update(payload)
    const computedSignature = hmac.digest('base64')
    
    return signature === computedSignature
  }
}
