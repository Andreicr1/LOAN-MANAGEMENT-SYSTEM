type Event = {
  documentId: string
}

type EmbeddedUrlResponse = {
  success: boolean
  url?: string
  expiresAt?: string | null
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

export const handler = async (event: Event): Promise<EmbeddedUrlResponse> => {
  if (!apiKey) {
    return { success: false, error: 'SIGNWELL_API_KEY não configurado' }
  }

  if (!event.documentId) {
    return { success: false, error: 'documentId é obrigatório' }
  }

  const response = await fetch(`https://www.signwell.com/api/v1/documents/${event.documentId}`, {
    headers: {
      'X-Api-Key': apiKey
    }
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

  const doc = await response.json()
  if (!doc.embedded_edit_url) {
    return { success: false, error: 'SignWell não retornou embedded_edit_url' }
  }

  return {
    success: true,
    url: doc.embedded_edit_url,
    expiresAt: doc.embedded_edit_url_expires_at ?? null
  }
}

