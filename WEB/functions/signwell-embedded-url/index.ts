type Event = {
  documentId: string
}

export const handler = async (event: Event) => {
  const response = await fetch(`https://www.signwell.com/api/v1/documents/${event.documentId}`, {
    headers: {
      'X-Api-Key': process.env.SIGNWELL_API_KEY ?? ''
    }
  })

  if (!response.ok) {
    throw new Error(`SignWell error: ${response.status}`)
  }

  const doc = await response.json()
  if (!doc.embedded_edit_url) {
    throw new Error('embedded_edit_url não disponível')
  }

  return { url: doc.embedded_edit_url, expires_at: null }
}

