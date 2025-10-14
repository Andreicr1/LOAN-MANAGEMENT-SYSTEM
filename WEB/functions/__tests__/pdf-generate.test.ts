import { handler } from '../pdf-generate/index'

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn(() => ({ send: jest.fn(() => Promise.resolve({})) })),
  PutObjectCommand: jest.fn()
}))

test('gera PDF e envia ao S3', async () => {
  const result = await handler({ disbursementId: '123', template: 'promissoryNote', payload: {} })
  expect(result.success).toBe(true)
})


