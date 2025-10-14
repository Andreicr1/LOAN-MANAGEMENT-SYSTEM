import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb'
import { parse } from 'csv-parse/sync'
import { v4 as uuid } from 'uuid'

type Event = {
  key: string
  uploadedBy: string
}

const s3 = new S3Client({ region: process.env.AWS_REGION })
const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}))
const bucket = process.env.UPLOAD_BUCKET!
const tableName = process.env.DATA_TABLE_NAME!

export const handler = async (event: Event) => {
  const object = await s3.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: event.key
    })
  )

  const buffer = await object.Body?.transformToByteArray()
  if (!buffer) {
    throw new Error('CSV de conciliação não encontrado')
  }

  const csv = Buffer.from(buffer).toString('utf-8')
  const rows = parse(csv, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  }) as Array<Record<string, string>>

  const errors: string[] = []
  let imported = 0

  for (const row of rows) {
    const date = row['Date'] || row['Transaction Date'] || row['date']
    const amount = row['Amount'] || row['amount'] || row['Credit'] || row['Debit']
    const description = row['Description'] || row['description'] || row['Memo']
    const reference = row['Reference'] || row['reference'] || row['Check Number']

    if (!date || !amount) {
      errors.push(`Linha ignorada: ${JSON.stringify(row)}`)
      continue
    }

    const parsedAmount = parseFloat(amount.toString().replace(/[^0-9.-]/g, ''))

    await dynamo.send(
      new PutCommand({
        TableName: tableName,
        Item: {
          __typename: 'BankTransaction',
          id: uuid(),
          transactionDate: new Date(date).toISOString().split('T')[0],
          amount: Math.abs(parsedAmount),
          description: description ?? null,
          reference: reference ?? null,
          matched: false,
          uploadedBy: event.uploadedBy
        }
      })
    )

    imported += 1
  }

  return {
    success: errors.length === 0,
    imported,
    errors
  }
}

