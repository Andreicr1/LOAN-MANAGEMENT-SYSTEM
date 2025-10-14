import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb'

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}))
const table = process.env.DATA_TABLE_NAME!

export const handler = async (event: { status?: string }) => {
  const filter = event.status
    ? {
        FilterExpression: '#type = :type AND #status = :status',
        ExpressionAttributeNames: { '#type': '__typename', '#status': 'status' },
        ExpressionAttributeValues: { ':type': 'Disbursement', ':status': event.status }
      }
    : {
        FilterExpression: '#type = :type',
        ExpressionAttributeNames: { '#type': '__typename' },
        ExpressionAttributeValues: { ':type': 'Disbursement' }
      }

  const result = await client.send(
    new ScanCommand({
      TableName: table,
      ...filter
    })
  )
  return result.Items ?? []
}

