import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendEmail({
  to,
  subject,
  html,
  from = process.env.RESEND_FROM_EMAIL || 'noreply@mindeeze.com',
}: {
  to: string | string[]
  subject: string
  html: string
  from?: string
}) {
  try {
    const data = await resend.emails.send({
      from,
      to,
      subject,
      html,
    })
    return { success: true, data }
  } catch (error) {
    console.error('Error sending email:', error)
    return { success: false, error }
  }
}

export async function sendAppointmentReminder({
  to,
  clientName,
  appointmentDate,
  appointmentTime,
  therapistName,
  locationType,
  joinLink,
}: {
  to: string
  clientName: string
  appointmentDate: string
  appointmentTime: string
  therapistName: string
  locationType: string
  joinLink?: string
}) {
  const subject = `Appointment Reminder with ${therapistName}`
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Appointment Reminder</h2>
      <p>Hi ${clientName},</p>
      <p>This is a reminder that you have an upcoming appointment with ${therapistName}.</p>
      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Date:</strong> ${appointmentDate}</p>
        <p><strong>Time:</strong> ${appointmentTime}</p>
        <p><strong>Type:</strong> ${locationType}</p>
      </div>
      ${joinLink ? `
        <p>
          <a href="${joinLink}" style="display: inline-block; background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
            Join Session
          </a>
        </p>
      ` : ''}
      <p>If you need to reschedule, please contact your therapist directly.</p>
      <p>Best regards,<br>MindEeze</p>
    </div>
  `

  return sendEmail({ to, subject, html })
}

export async function sendInvoiceEmail({
  to,
  clientName,
  invoiceNumber,
  amount,
  currency,
  dueDate,
  paymentLink,
}: {
  to: string
  clientName: string
  invoiceNumber: string
  amount: number
  currency: string
  dueDate: string
  paymentLink?: string
}) {
  const subject = `Invoice #${invoiceNumber} from MindEeze`
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Invoice #${invoiceNumber}</h2>
      <p>Hi ${clientName},</p>
      <p>Please find your invoice details below:</p>
      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Invoice Number:</strong> ${invoiceNumber}</p>
        <p><strong>Amount:</strong> ${currency.toUpperCase()} ${amount.toFixed(2)}</p>
        <p><strong>Due Date:</strong> ${dueDate}</p>
      </div>
      ${paymentLink ? `
        <p>
          <a href="${paymentLink}" style="display: inline-block; background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
            Pay Now
          </a>
        </p>
      ` : ''}
      <p>Thank you for your payment.</p>
      <p>Best regards,<br>MindEeze</p>
    </div>
  `

  return sendEmail({ to, subject, html })
}
