import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb'

type Event =
  | { type: 'dashboard-kpis' }
  | { type: 'aging' }
  | { type: 'period'; start: string; end: string }
  | { type: 'acquired-assets' }

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}))
const tableName = process.env.DATA_TABLE_NAME!

export const handler = async (event: Event) => {
  switch (event.type) {
    case 'dashboard-kpis':
      return getDashboardKPIs()
    case 'aging':
      return getAging()
    case 'period':
      return getPeriod(event.start, event.end)
    case 'acquired-assets':
      return getAcquiredAssets()
    default:
      throw new Error('Unknown report type')
  }
}

async function getDashboardKPIs() {
  const loans = await client.send(
    new ScanCommand({
      TableName: tableName,
      FilterExpression: '#type = :type AND #status = :approved',
      ExpressionAttributeNames: { '#type': '__typename', '#status': 'status' },
      ExpressionAttributeValues: { ':type': 'Disbursement', ':approved': 'APPROVED' }
    })
  )

  const totalDisbursed = loans.Items?.reduce((sum, item) => sum + (item.amount ?? 0), 0) ?? 0

  return {
    totalDisbursed,
    outstandingBalance: totalDisbursed,
    activePNs: loans.Count ?? 0
  }
}

async function getAging() {
  const result = await client.send(
    new ScanCommand({
      TableName: tableName,
      FilterExpression: '#type = :type',
      ExpressionAttributeNames: { '#type': '__typename' },
      ExpressionAttributeValues: { ':type': 'PromissoryNote' }
    })
  )

  return { items: result.Items ?? [] }
}

async function getPeriod(start: string, end: string) {
  const result = await client.send(
    new ScanCommand({
      TableName: tableName,
      FilterExpression: '#type = :type AND createdAt BETWEEN :start AND :end',
      ExpressionAttributeNames: { '#type': '__typename' },
      ExpressionAttributeValues: { ':type': 'Disbursement', ':start': start, ':end': end }
    })
  )

  return { items: result.Items ?? [] }
}

async function getAcquiredAssets() {
  const result = await client.send(
    new ScanCommand({
      TableName: tableName,
      FilterExpression: '#type = :type AND attribute_exists(assets)',
      ExpressionAttributeNames: { '#type': '__typename' },
      ExpressionAttributeValues: { ':type': 'PromissoryNote' }
    })
  )

  return { items: result.Items ?? [] }
}

