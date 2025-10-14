import { handler } from '../signwell-create/index'

const mockFetch = jest.fn()

global.fetch = mockFetch as any

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn(() => ({
    send: jest.fn(() => Promise.resolve({ Body: { transformToByteArray: async () => new TextEncoder().encode('pdf') } }))
  })),
  GetObjectCommand: jest.fn()
}))

describe('signwell-create handler', () => {
  beforeEach(() => {
    process.env.SIGNWELL_API_KEY = 'test'
    process.env.PDF_BUCKET = 'test-bucket'
    mockFetch.mockReset()
  })

  it('cria documento SignWell com sucesso', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ id: 'doc-1', status: 'draft' })
    })

    const result = await handler({ name: 'Doc Teste', pdfKey: 'key.pdf', recipients: [{ name: 'A', email: 'a@x.com' }] })
    expect(result).toEqual({ success: true, documentId: 'doc-1', status: 'draft', embeddedEditUrl: null, raw: { id: 'doc-1', status: 'draft' } })
  })

  it('retorna erro quando API falha', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: () => Promise.resolve('{"error":"bad request"}')
    })

    const result = await handler({ name: 'Doc Teste', pdfKey: 'key.pdf', recipients: [{ name: 'A', email: 'a@x.com' }] })
    expect(result.success).toBe(false)
    expect(result.error).toContain('bad request')
  })

  it('valida parâmetros obrigatórios', async () => {
    const result = await handler({ name: 'Doc', pdfKey: '', recipients: [] as any })
    expect(result.success).toBe(false)
  })
})


