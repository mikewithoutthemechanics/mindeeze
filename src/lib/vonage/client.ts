import { Vonage } from '@vonage/server-sdk'

const vonage = new Vonage({
  apiKey: process.env.VONAGE_API_KEY!,
  apiSecret: process.env.VONAGE_API_SECRET!,
})

export async function sendSMS({
  to,
  text,
  from = process.env.VONAGE_FROM_NUMBER || 'MindEeze',
}: {
  to: string
  text: string
  from?: string
}) {
  try {
    const response = await vonage.sms.send({
      to,
      from,
      text,
    })
    return { success: true, response }
  } catch (error) {
    console.error('Error sending SMS:', error)
    return { success: false, error }
  }
}

export async function sendAppointmentReminderSMS({
  to,
  clientName,
  appointmentDate,
  appointmentTime,
  therapistName,
}: {
  to: string
  clientName: string
  appointmentDate: string
  appointmentTime: string
  therapistName: string
}) {
  const text = `Hi ${clientName}, reminder: You have an appointment with ${therapistName} on ${appointmentDate} at ${appointmentTime}. Reply CANCEL to reschedule. MindEeze`
  return sendSMS({ to, text })
}

export async function sendPaymentReminderSMS({
  to,
  clientName,
  invoiceNumber,
  amount,
  currency,
  daysOverdue,
}: {
  to: string
  clientName: string
  invoiceNumber: string
  amount: number
  currency: string
  daysOverdue: number
}) {
  const text = `Hi ${clientName}, reminder: Invoice #${invoiceNumber} for ${currency.toUpperCase()} ${amount.toFixed(2)} is ${daysOverdue} days overdue. Please arrange payment. MindEeze`
  return sendSMS({ to, text })
}
