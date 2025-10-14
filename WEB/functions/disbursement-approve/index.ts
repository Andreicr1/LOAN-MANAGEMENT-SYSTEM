import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, UpdateCommand, PutCommand } from '@aws-sdk/lib-dynamodb'
import { v4 as uuid } from 'uuid'

type Event = {
  id: string
  userId: string
}

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}))
const tableName = process.env.DATA_TABLE_NAME!

export const handler = async (event: Event) => {
  const timestamp = new Date().toISOString()

  await dynamo.send(
    new UpdateCommand({
      TableName: tableName,
      Key: { __typename: 'Disbursement', id: event.id },
      UpdateExpression: 'SET #status = :approved, approvedBy = :userId, approvedAt = :timestamp',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: {
        ':approved': 'APPROVED',
        ':userId': event.userId,
        ':timestamp': timestamp
      }
    })
  )

  await dynamo.send(
    new PutCommand({
      TableName: tableName,
      Item: {
        __typename: 'AuditLog',
        id: uuid(),
        userId: event.userId,
        action: 'DISBURSEMENT_APPROVED',
        details: JSON.stringify({ id: event.id }),
        timestamp
      }
    })
  )

  return { success: true }
}

