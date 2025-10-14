import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'

type Event = {
  key: string
  fileName: string
}

const s3 = new S3Client({ region: process.env.AWS_REGION })
const bucket = process.env.UPLOAD_BUCKET!

export const handler = async (event: Event) => {
  const object = await s3.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: event.key
    })
  )

  const buffer = await object.Body?.transformToByteArray()
  if (!buffer) {
    throw new Error('Arquivo PDF não encontrado')
  }

  // Validação simplificada: checa presença de marcadores de assinatura.
  const content = Buffer.from(buffer).toString('utf-8', 0, 50000)
  const hasSignature =
    content.includes('/Type /Sig') ||
    content.includes('/SubFilter /adbe.pkcs7') ||
    content.includes('/ByteRange')

  return {
    isSigned: hasSignature,
    signerName: hasSignature ? 'Unknown' : undefined,
    sizeInBytes: buffer.length
  }
}

