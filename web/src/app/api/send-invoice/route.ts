import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { to, clientName, invoiceNumber, amount, currency, dueDate, paymentUrl } = body

    if (!to || !clientName || !invoiceNumber || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const emailContent = {
      from: 'MindEeze <invoices@mindeeze.com>',
      to,
      subject: `Invoice ${invoiceNumber} from MindEeze`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
            .content { background: #f9fafb; padding: 30px; border-radius: 8px; margin-top: 20px; }
            .button { display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>MindEeze</h1>
            </div>
            <div class="content">
              <h2>Invoice ${invoiceNumber}</h2>
              <p>Dear ${clientName},</p>
              <p>This is a friendly reminder that you have an invoice due for payment.</p>
              <p><strong>Amount Due:</strong> ${currency.toUpperCase()} ${amount.toFixed(2)}</p>
              <p><strong>Due Date:</strong> ${dueDate}</p>
              ${paymentUrl ? `
                <p>To pay your invoice online, click the button below:</p>
                <a href="${paymentUrl}" class="button">Pay Invoice Now</a>
              ` : ''}
              <p style="margin-top: 20px;">If you have any questions, please don't hesitate to contact us.</p>
            </div>
            <div class="footer">
              <p>This is an automated email from MindEeze.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    }

    const { data, error } = await resend.emails.send(emailContent)

    if (error) {
      console.error('Error sending email:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error in send-invoice API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
