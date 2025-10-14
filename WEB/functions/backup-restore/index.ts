import { DynamoDBClient, BatchWriteItemCommand } from '@aws-sdk/client-dynamodb'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'

type Event = {
  key: string
}

const dynamo = new DynamoDBClient({})
const s3 = new S3Client({ region: process.env.AWS_REGION })
const tableName = process.env.DATA_TABLE_NAME!
const bucket = process.env.EXPORT_BUCKET!

export const handler = async (event: Event) => {
  const object = await s3.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: event.key
    })
  )

  const buffer = await object.Body?.transformToByteArray()
  if (!buffer) {
    throw new Error('Backup não encontrado')
  }

  const payload = JSON.parse(Buffer.from(buffer).toString('utf-8')) as { items: any[] }

  const chunks = chunk(payload.items, 25)
  for (const chunkItems of chunks) {
    await dynamo.send(
      new BatchWriteItemCommand({
        RequestItems: {
          [tableName]: chunkItems.map((item) => ({ PutRequest: { Item: item } }))
        }
      })
    )
  }

  return { success: true }
}

function chunk<T>(array: T[], size: number): T[][] {
  const result: T[][] = []
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size))
  }
  return result
}


