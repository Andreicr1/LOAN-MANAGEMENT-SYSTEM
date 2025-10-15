import crypto from 'crypto'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

type Event = {
  headers: Record<string, string | undefined>
  body: string
}

type SignwellPayload = {
  event: {
    type: string
    time: number
  }
  data: {
    object: {
      id: string
      status?: string
      completed_at?: string
    }
  }
}

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}))
const s3 = new S3Client({ region: process.env.AWS_REGION })

const resolveEnv = (keys: string[]) => keys.map((key) => process.env[key]).find(Boolean)

const tableName = resolveEnv(['DATA_TABLE_NAME', 'AMPLIFY_DATA_TABLE_NAME'])
const bucket = resolveEnv(['PDF_BUCKET', 'S3_PDF_BUCKET'])
const webhookSecret = resolveEnv(['SIGNWELL_WEBHOOK_SECRET'])
const staticToken = resolveEnv(['WEBHOOK_TOKEN'])
const allowUnverified = process.env.ALLOW_UNVERIFIED_WEBHOOKS === 'true'
const apiKey = resolveEnv(['SIGNWELL_API_KEY'])

const verifySignature = (payload: string, signature: string | undefined, secret: string) => {
  if (!signature) return false
  const computed = crypto.createHmac('sha256', secret).update(payload).digest('hex')
  return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(signature))
}

export const handler = async (event: Event) => {
  const headers = Object.fromEntries(
    Object.entries(event.headers || {}).map(([k, v]) => [k.toLowerCase(), v])
  ) as Record<string, string | undefined>

  const signature = headers['x-signwell-signature']
  const tokenFromHeader = headers['x-webhook-token']

  const hasHmac = !!(webhookSecret && verifySignature(event.body, signature, webhookSecret))
  const hasStaticToken = !!(staticToken && tokenFromHeader && tokenFromHeader === staticToken)

  if (!hasHmac && !hasStaticToken && !allowUnverified) {
    return { statusCode: 401, body: 'Unauthorized webhook' }
  }

  const payload = JSON.parse(event.body) as SignwellPayload
  const documentId = payload.data.object.id
  const eventType = payload.event.type

  const updates: Promise<unknown>[] = []

  if (tableName) {
    if (eventType === 'document.completed') {
      updates.push(
        dynamo.send(
          new UpdateCommand({
            TableName: tableName,
            Key: { id: documentId, __typename: 'PromissoryNote' },
            UpdateExpression: 'SET signwell_status = :status, signwell_completed_at = :completedAt',
            ExpressionAttributeValues: {
              ':status': 'completed',
              ':completedAt': payload.data.object.completed_at ?? new Date().toISOString()
            }
          })
        )
      )
    } else if (eventType === 'document.declined') {
      updates.push(
        dynamo.send(
          new UpdateCommand({
            TableName: tableName,
            Key: { id: documentId, __typename: 'PromissoryNote' },
            UpdateExpression: 'SET signwell_status = :status',
            ExpressionAttributeValues: {
              ':status': 'declined'
            }
          })
        )
      )
    }
  }

  if (eventType === 'document.completed' && bucket && apiKey) {
    const pdfResponse = await fetch(`https://www.signwell.com/api/v1/documents/${documentId}/completed_pdf`, {
      headers: {
        'X-Api-Key': apiKey
      }
    })

    if (pdfResponse.ok) {
      const pdfBuffer = Buffer.from(await pdfResponse.arrayBuffer())
      updates.push(
        s3.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: `signwell/${documentId}.pdf`,
            Body: pdfBuffer,
            ContentType: 'application/pdf'
          })
        )
      )
    }
  }

  await Promise.allSettled(updates)

  return { statusCode: 200, body: 'ok' }
}
