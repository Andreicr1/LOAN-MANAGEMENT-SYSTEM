import { handler } from '../reports-aggregates/index'

jest.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: { from: jest.fn(() => ({ send: jest.fn().mockResolvedValue({ Items: [], Count: 0 }) })) },
  ScanCommand: jest.fn(),
  QueryCommand: jest.fn()
}))

test('retorna KPIs padrão', async () => {
  const result = await handler({ type: 'dashboard-kpis' })
  expect(result).toHaveProperty('totalDisbursed', 0)
})


