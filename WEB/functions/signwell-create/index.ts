import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'

type Event = {
  documentId: string
  s3Key: string
  recipients: Array<{ name: string; email: string }>
}

const s3 = new S3Client({ region: process.env.AWS_REGION })

const apiKey = process.env.SIGNWELL_API_KEY
const testMode = process.env.SIGNWELL_TEST_MODE === 'true'
const bucket = process.env.PDF_BUCKET!

export const handler = async (event: Event) => {
  const document = await s3.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: event.s3Key
    })
  )

  const fileBuffer = await document.Body?.transformToByteArray()
  if (!fileBuffer) {
    throw new Error('Documento PDF não encontrado no S3')
  }

  const pdfBase64 = Buffer.from(fileBuffer).toString('base64')

  const response = await fetch('https://www.signwell.com/api/v1/documents', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': apiKey ?? ''
    },
    body: JSON.stringify({
    name: event.documentId,
    files: [
      {
        name: event.documentId,
        file_base64: pdfBase64
      }
    ],
      recipients: event.recipients?.map((recipient, index) => ({
        id: `recipient-${index}`,
        name: recipient.name,
        email: recipient.email,
        send_email: true,
        send_email_delay: 0
      })),
      test_mode: testMode
    })
  })

  if (!response.ok) {
    throw new Error(`SignWell error: ${response.status}`)
  }

  return response.json()
}

