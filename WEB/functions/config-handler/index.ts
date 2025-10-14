import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}))
const tableName = process.env.DATA_TABLE_NAME!

type Event =
  | { action: 'get' }
  | { action: 'update'; payload: Record<string, any> }

export const handler = async (event: Event) => {
  switch (event.action) {
    case 'get':
      return getConfig()
    case 'update':
      return updateConfig(event.payload)
    default:
      throw new Error('Unknown action')
  }
}

async function getConfig() {
  const result = await dynamo.send(
    new GetCommand({
      TableName: tableName,
      Key: {
        __typename: 'Config',
        id: 'GLOBAL'
      }
    })
  )

  return result.Item ?? {}
}

async function updateConfig(payload: Record<string, any>) {
  const updateExpressions: string[] = []
  const expressionValues: Record<string, any> = {}

  Object.entries(payload).forEach(([key, value]) => {
    updateExpressions.push(`#${key} = :${key}`)
    expressionValues[`:${key}`] = value
  })

  await dynamo.send(
    new UpdateCommand({
      TableName: tableName,
      Key: {
        __typename: 'Config',
        id: 'GLOBAL'
      },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: Object.fromEntries(Object.keys(payload).map((key) => [`#${key}`, key])),
      ExpressionAttributeValues: expressionValues
    })
  )

  return { success: true }
}

