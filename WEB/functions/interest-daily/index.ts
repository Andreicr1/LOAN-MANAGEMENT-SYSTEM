import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, ScanCommand, PutCommand } from '@aws-sdk/lib-dynamodb'

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}))
const tableName = process.env.DATA_TABLE_NAME!

export const handler = async () => {
  const today = new Date().toISOString().split('T')[0]

  const notes = await client.send(
    new ScanCommand({
      TableName: tableName,
      FilterExpression: '#type = :type',
      ExpressionAttributeNames: { '#type': '__typename' },
      ExpressionAttributeValues: { ':type': 'PromissoryNote' }
    })
  )

  const items = notes.Items ?? []

  for (const note of items) {
    const principal = note.amount ?? 0
    const interestRate = note.interestRate ?? 0.145
    const issueDate = note.createdAt ?? today
    const daysOutstanding = Math.max(
      Math.floor((Date.now() - new Date(issueDate).getTime()) / (1000 * 60 * 60 * 24)),
      0
    )

    const interestAmount = (principal * interestRate * daysOutstanding) / 360

    await client.send(
      new PutCommand({
        TableName: tableName,
        Item: {
          __typename: 'InterestCalculation',
          id: `${note.id}-${today}`,
          disbursementId: note.disbursementId,
          interestAmount,
          calculationDate: today,
          createdAt: new Date().toISOString()
        }
      })
    )
  }

  return { success: true, processed: items.length }
}


