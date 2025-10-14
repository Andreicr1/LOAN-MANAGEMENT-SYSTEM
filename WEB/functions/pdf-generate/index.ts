import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { v4 as uuid } from 'uuid'
import { resolve } from 'path'
import { createWriteStream, unlinkSync, readFileSync } from 'fs'
import PDFDocument from 'pdfkit'

type Event = {
  disbursementId: string
  template: 'promissoryNote' | 'report'
  payload: any
}

const s3 = new S3Client({ region: process.env.AWS_REGION })
const bucket = process.env.PDF_BUCKET!

export const handler = async (event: Event) => {
  const fileName = `${event.disbursementId}-${uuid()}.pdf`
  const tempPath = resolve('/tmp', fileName)

  try {
    const doc = new PDFDocument()
    const fileStream = createWriteStream(tempPath)
    doc.pipe(fileStream)

    doc.fontSize(20).text(`Document ${event.template}`, { align: 'center' })
    doc.moveDown()
    doc.fontSize(12).text(`Disbursement ID: ${event.disbursementId}`)
    doc.text(`Generated at: ${new Date().toISOString()}`)
    doc.text(JSON.stringify(event.payload, null, 2))
    doc.end()

    await new Promise((resolveStream, rejectStream) => {
      fileStream.on('finish', resolveStream)
      fileStream.on('error', rejectStream)
    })

    const file = readFileSync(tempPath)

    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: `generated/${fileName}`,
        Body: file,
        ContentType: 'application/pdf'
      })
    )

    return {
      success: true,
      key: `generated/${fileName}`
    }
  } finally {
    try {
      unlinkSync(tempPath)
    } catch (error) {
      console.warn('Cleanup temp file failed', error)
    }
  }
}

