import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

type Event = {
  headers: Record<string, string>
  body: string
}

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}))
const s3 = new S3Client({ region: process.env.AWS_REGION })
const tableName = process.env.DATA_TABLE_NAME!
const bucket = process.env.PDF_BUCKET!
const webhookSecret = process.env.SIGNWELL_WEBHOOK_SECRET

export const handler = async (event: Event) => {
  if (!webhookSecret) {
    throw new Error('Webhook secret não configurado')
  }

  const signature = event.headers['x-signwell-signature']
  if (!signature || signature !== webhookSecret) {
    return { statusCode: 401, body: 'Invalid signature' }
  }

  const payload = JSON.parse(event.body) as any

  const item = {
    __typename: 'SignwellEvent',
    id: `${payload.event.hash}-${payload.event.time}`,
    type: payload.event.type,
    documentId: payload.data.object.id,
    receivedAt: new Date().toISOString(),
    payload
  }

  await dynamo.send(
    new PutCommand({
      TableName: tableName,
      Item: item
    })
  )

  if (payload.event.type === 'document_completed') {
    const pdfResponse = await fetch(`https://www.signwell.com/api/v1/documents/${payload.data.object.id}/completed_pdf`, {
      headers: {
        'X-Api-Key': process.env.SIGNWELL_API_KEY ?? ''
      }
    })

    if (pdfResponse.ok) {
      const pdfBuffer = Buffer.from(await pdfResponse.arrayBuffer())
      await s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: `signwell/${payload.data.object.id}.pdf`,
          Body: pdfBuffer,
          ContentType: 'application/pdf'
        })
      )
    }
  }

  return { statusCode: 200, body: 'ok' }
}

