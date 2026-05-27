import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { sendInvoiceEmail } from '../../../web/src/lib/resend/client.ts'
import { sendPaymentReminderSMS } from '../../../web/src/lib/vonage/client.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req) => {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get invoices that are 7 days overdue (not yet reminded at 7d)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString()

    const { data: sevenDayInvoices, error: sevenDayError } = await supabase
      .from('invoices')
      .select(`
        *,
        clients(full_name, email, phone)
      `)
      .lte('due_date', sevenDaysAgo)
      .gt('due_date', eightDaysAgo)
      .in('status', ['sent', 'overdue'])
      .eq('reminder_sent_7d', false)

    if (sevenDayError) {
      throw new Error(`Error fetching 7-day overdue invoices: ${sevenDayError.message}`)
    }

    // Get invoices that are 14 days overdue (not yet reminded at 14d)
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
    const fifteenDaysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()

    const { data: fourteenDayInvoices, error: fourteenDayError } = await supabase
      .from('invoices')
      .select(`
        *,
        clients(full_name, email, phone)
      `)
      .lte('due_date', fourteenDaysAgo)
      .gt('due_date', fifteenDaysAgo)
      .in('status', ['sent', 'overdue'])
      .eq('reminder_sent_14d', false)

    if (fourteenDayError) {
      throw new Error(`Error fetching 14-day overdue invoices: ${fourteenDayError.message}`)
    }

    const results = []

    // Process 7-day reminders
    if (sevenDayInvoices && sevenDayInvoices.length > 0) {
      for (const invoice of sevenDayInvoices) {
        const client = invoice.clients
        const daysOverdue = Math.floor((Date.now() - new Date(invoice.due_date).getTime()) / (1000 * 60 * 60 * 24))

        // Send email reminder
        if (client.email) {
          const emailResult = await sendInvoiceEmail({
            to: client.email,
            clientName: client.full_name,
            invoiceNumber: invoice.invoice_number,
            amount: invoice.amount,
            currency: invoice.currency,
            dueDate: new Date(invoice.due_date).toLocaleDateString(),
          })
          results.push({ type: 'email_7d', success: emailResult.success, invoiceId: invoice.id })
        }

        // Send SMS reminder
        if (client.phone) {
          const smsResult = await sendPaymentReminderSMS({
            to: client.phone,
            clientName: client.full_name,
            invoiceNumber: invoice.invoice_number,
            amount: invoice.amount,
            currency: invoice.currency,
            daysOverdue,
          })
          results.push({ type: 'sms_7d', success: smsResult.success, invoiceId: invoice.id })
        }

        // Mark reminder as sent
        const { error: updateError } = await supabase
          .from('invoices')
          .update({ reminder_sent_7d: true })
          .eq('id', invoice.id)

        if (updateError) {
          results.push({ type: 'update_7d', success: false, error: updateError.message })
        }
      }
    }

    // Process 14-day reminders
    if (fourteenDayInvoices && fourteenDayInvoices.length > 0) {
      for (const invoice of fourteenDayInvoices) {
        const client = invoice.clients
        const daysOverdue = Math.floor((Date.now() - new Date(invoice.due_date).getTime()) / (1000 * 60 * 60 * 24))

        // Send email reminder
        if (client.email) {
          const emailResult = await sendInvoiceEmail({
            to: client.email,
            clientName: client.full_name,
            invoiceNumber: invoice.invoice_number,
            amount: invoice.amount,
            currency: invoice.currency,
            dueDate: new Date(invoice.due_date).toLocaleDateString(),
          })
          results.push({ type: 'email_14d', success: emailResult.success, invoiceId: invoice.id })
        }

        // Send SMS reminder
        if (client.phone) {
          const smsResult = await sendPaymentReminderSMS({
            to: client.phone,
            clientName: client.full_name,
            invoiceNumber: invoice.invoice_number,
            amount: invoice.amount,
            currency: invoice.currency,
            daysOverdue,
          })
          results.push({ type: 'sms_14d', success: smsResult.success, invoiceId: invoice.id })
        }

        // Mark reminder as sent and update status to overdue
        const { error: updateError } = await supabase
          .from('invoices')
          .update({ 
            reminder_sent_14d: true,
            status: 'overdue'
          })
          .eq('id', invoice.id)

        if (updateError) {
          results.push({ type: 'update_14d', success: false, error: updateError.message })
        }
      }
    }

    return new Response(
      JSON.stringify({
        message: `Processed ${sevenDayInvoices?.length || 0} 7-day reminders and ${fourteenDayInvoices?.length || 0} 14-day reminders`,
        results,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
