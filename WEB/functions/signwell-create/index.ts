import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'

type Recipient = {
  name: string
  email: string
  id?: string
  order?: number
  sendEmail?: boolean
  sendEmailDelay?: number
  role?: 'signer' | 'cc'
}

type Event = {
  name: string
  pdfKey: string
  recipients: Recipient[]
  cc?: Array<{ name: string; email: string }>
  subject?: string
  message?: string
  reminderDays?: number
  metadata?: Record<string, any>
  testMode?: boolean
}

type SignwellCreateResponse = {
  success: boolean
  documentId?: string
  status?: string
  embeddedEditUrl?: string | null
  raw?: any
  error?: string
  details?: any
}

const s3 = new S3Client({ region: process.env.AWS_REGION })

const resolveEnv = (keys: string[]) => keys.map((key) => process.env[key]).find(Boolean)

const apiKey = resolveEnv(['SIGNWELL_API_KEY'])
const bucket =
  resolveEnv(['PDF_BUCKET', 'S3_PDF_BUCKET', 'SIGNWELL_PDF_BUCKET']) || process.env.AWS_S3_PDF_BUCKET

const parseError = async (response: Response) => {
  const text = await response.text()
  try {
    return JSON.parse(text)
  } catch (err) {
    return text
  }
}

export const handler = async (event: Event): Promise<SignwellCreateResponse> => {
  if (!apiKey) {
    return { success: false, error: 'SIGNWELL_API_KEY não configurado' }
  }

  if (!bucket) {
    return { success: false, error: 'PDF bucket não configurado (PDF_BUCKET)' }
  }

  if (!event.pdfKey) {
    return { success: false, error: 'pdfKey é obrigatório' }
  }

  if (!event.recipients || event.recipients.length === 0) {
    return { success: false, error: 'Pelo menos um destinatário é obrigatório' }
  }

  const document = await s3.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: event.pdfKey
    })
  )

  const bodyStream = document.Body
  const fileBuffer = await bodyStream?.transformToByteArray()
  if (!fileBuffer) {
    return { success: false, error: 'Documento PDF não encontrado no S3' }
  }

  const pdfBase64 = Buffer.from(fileBuffer).toString('base64')

  const recipientsPayload = event.recipients.map((recipient, index) => ({
    id: recipient.id ?? `recipient-${index + 1}`,
    name: recipient.name,
    email: recipient.email,
    role: recipient.role ?? 'signer',
    order: recipient.order ?? index + 1,
    send_email: recipient.sendEmail ?? true,
    send_email_delay: recipient.sendEmailDelay ?? 0
  }))

  const payload = {
    name: event.name,
    files: [
      {
        name: event.name,
        file_base64: pdfBase64
      }
    ],
    recipients: recipientsPayload,
    cc: event.cc?.map((recipient) => ({
      name: recipient.name,
      email: recipient.email
    })),
    subject: event.subject,
    message: event.message,
    reminder_days: event.reminderDays,
    metadata: event.metadata,
    test_mode: event.testMode ?? process.env.SIGNWELL_TEST_MODE === 'true'
  }

  const response = await fetch('https://www.signwell.com/api/v1/documents', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': apiKey
    },
    body: JSON.stringify(payload)
  })

  if (!response.ok) {
    const errorDetails = await parseError(response)
    const errorMessage = typeof errorDetails === 'string' ? errorDetails : errorDetails?.error || 'Erro ao criar documento SignWell'
    return {
      success: false,
      error: errorMessage,
      details: errorDetails
    }
  }

  const data = await response.json()

  return {
    success: true,
    documentId: data.id,
    status: data.status,
    embeddedEditUrl: data.embedded_edit_url ?? null,
    raw: data
  }
}

