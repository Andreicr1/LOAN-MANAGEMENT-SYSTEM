import { handler } from '../disbursement-approve/index'

jest.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: { from: jest.fn(() => ({ send: jest.fn().mockResolvedValue({}) })) },
  UpdateCommand: jest.fn(),
  PutCommand: jest.fn()
}))

test('aprova desembolso com sucesso', async () => {
  const result = await handler({ id: '123', userId: '456' })
  expect(result).toEqual({ success: true })
})


