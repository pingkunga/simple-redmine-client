import nodemailer from 'nodemailer'

export interface MailOptions {
  to: string | string[]
  subject: string
  html: string
  from?: string
}

export async function sendMail(options: MailOptions): Promise<void> {
  const config = useRuntimeConfig()

  const transporter = nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort || 587,
    secure: config.smtpSecure || false, // true for 465, false for other ports
    auth: {
      user: config.smtpUser,
      pass: config.smtpPass,
    },
  })

  const mailOptions = {
    from: options.from || config.smtpFrom || config.smtpUser,
    to: options.to,
    subject: options.subject,
    html: options.html,
  }

  await transporter.sendMail(mailOptions)
}

export default {
  sendMail,
}