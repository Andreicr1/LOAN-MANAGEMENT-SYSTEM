import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb'

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}))
const table = process.env.DATA_TABLE_NAME!

export const handler = async (event: { id: string }) => {
  await client.send(
    new UpdateCommand({
      TableName: table,
      Key: { __typename: 'Disbursement', id: event.id },
      UpdateExpression: 'SET #status = :cancelled',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: { ':cancelled': 'CANCELLED' }
    })
  )
  return { success: true }
}

