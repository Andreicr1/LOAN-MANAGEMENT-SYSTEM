import nodemailer from 'nodemailer'

type Event = {
  config: {
    host: string
    port: number
    secure: boolean
    from: string
    user: string
    pass: string
  }
  message: EmailMessage
}

export const handler = async (event: Event) => {
  const transporter = nodemailer.createTransport({
    host: event.config.host,
    port: event.config.port,
    secure: event.config.secure,
    auth: {
      user: event.config.user,
      pass: event.config.pass
    }
  })

  await transporter.verify()

  const info = await transporter.sendMail({
    from: event.config.from,
    to: event.message.to,
    cc: event.message.cc,
    subject: event.message.subject,
    text: event.message.text,
    html: event.message.html,
    attachments: event.message.attachments
  })

  return { success: true, messageId: info.messageId }
}

