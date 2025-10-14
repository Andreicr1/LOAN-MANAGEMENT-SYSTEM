import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'

type Event = {
  key: string
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
    throw new Error('PDF não encontrado')
  }

  // TODO: Implementar parser real. Por enquanto retorna conteúdo base64 parcial.
  return {
    success: true,
    preview: Buffer.from(buffer).toString('base64').slice(0, 200)
  }
}

