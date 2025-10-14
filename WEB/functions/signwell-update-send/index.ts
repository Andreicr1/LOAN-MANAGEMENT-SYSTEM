type Event = {
  documentId: string
  metadata?: Record<string, any>
}

export const handler = async (event: Event) => {
  const response = await fetch(`https://www.signwell.com/api/v1/documents/${event.documentId}/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': process.env.SIGNWELL_API_KEY ?? ''
    },
    body: JSON.stringify({ metadata: event.metadata })
  })

  if (!response.ok) {
    throw new Error(`SignWell error: ${response.status}`)
  }

  return response.json()
}

