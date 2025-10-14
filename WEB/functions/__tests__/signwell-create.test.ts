import { handler } from '../signwell-create/index'

global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ id: 'doc-1' })
  })
) as any

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn(() => ({ send: jest.fn(() => Promise.resolve({ Body: { transformToByteArray: async () => new TextEncoder().encode('pdf') } })) })),
  GetObjectCommand: jest.fn()
}))

test('cria documento SignWell', async () => {
  const result = await handler({ documentId: 'doc', s3Key: 'key', recipients: [] })
  expect(result).toEqual({ id: 'doc-1' })
})


