import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { v4 as uuid } from 'uuid'

type Event = {
  requestedBy: string
}

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}))
const s3 = new S3Client({ region: process.env.AWS_REGION })
const tableName = process.env.DATA_TABLE_NAME!
const bucket = process.env.EXPORT_BUCKET!

export const handler = async (event: Event) => {
  const snapshot = await dynamo.send(
    new ScanCommand({
      TableName: tableName
    })
  )

  const key = `manual/${new Date().toISOString()}-${uuid()}.json`

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: JSON.stringify({ items: snapshot.Items, requestedBy: event.requestedBy }),
      ContentType: 'application/json'
    })
  )

  return { success: true, key }
}


