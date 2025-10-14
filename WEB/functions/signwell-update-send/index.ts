type Event = {
  documentId: string
  message?: string
  subject?: string
  sendEmail?: boolean
  sendSms?: boolean
  reminderDays?: number
  metadata?: Record<string, any>
}

type SendResponse = {
  success: boolean
  status?: string
  raw?: any
  error?: string
  details?: any
}

const resolveEnv = (keys: string[]) => keys.map((key) => process.env[key]).find(Boolean)
const apiKey = resolveEnv(['SIGNWELL_API_KEY'])

const parseError = async (response: Response) => {
  const text = await response.text()
  try {
    return JSON.parse(text)
  } catch (err) {
    return text
  }
}

export const handler = async (event: Event): Promise<SendResponse> => {
  if (!apiKey) {
    return { success: false, error: 'SIGNWELL_API_KEY não configurado' }
  }

  if (!event.documentId) {
    return { success: false, error: 'documentId é obrigatório' }
  }

  const payload = {
    message: event.message,
    subject: event.subject,
    send_email: event.sendEmail ?? true,
    send_sms: event.sendSms ?? false,
    reminder_days: event.reminderDays,
    metadata: event.metadata
  }

  const response = await fetch(`https://www.signwell.com/api/v1/documents/${event.documentId}/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': apiKey
    },
    body: JSON.stringify(payload)
  })

  if (!response.ok) {
    const details = await parseError(response)
    const errorMessage = typeof details === 'string' ? details : details?.error || `Erro SignWell ${response.status}`
    return {
      success: false,
      error: errorMessage,
      details
    }
  }

  const data = await response.json()
  return {
    success: true,
    status: data.status,
    raw: data
  }
}

