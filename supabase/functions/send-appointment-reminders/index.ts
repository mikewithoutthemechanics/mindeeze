import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { sendAppointmentReminder } from '../../../web/src/lib/resend/client.ts'
import { sendAppointmentReminderSMS } from '../../../web/src/lib/vonage/client.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req) => {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get appointments that need reminders (48 hours before, not yet reminded)
    const fortyEightHoursFromNow = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
    const fortyEightHoursPlusOneHour = new Date(Date.now() + 49 * 60 * 60 * 1000).toISOString()

    const { data: appointments, error: fetchError } = await supabase
      .from('appointments')
      .select(`
        *,
        clients(full_name, email, phone),
        therapists(full_name, practice_name, timezone)
      `)
      .gte('starts_at', fortyEightHoursFromNow)
      .lt('starts_at', fortyEightHoursPlusOneHour)
      .eq('status', 'scheduled')
      .eq('reminder_sent_48h', false)

    if (fetchError) {
      throw new Error(`Error fetching appointments: ${fetchError.message}`)
    }

    if (!appointments || appointments.length === 0) {
      return new Response(JSON.stringify({ message: 'No appointments to remind' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    const results = []

    for (const appointment of appointments) {
      const client = appointment.clients
      const therapist = appointment.therapists
      const appointmentDate = new Date(appointment.starts_at).toLocaleDateString()
      const appointmentTime = new Date(appointment.starts_at).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })

      // Send email reminder
      if (client.email) {
        const emailResult = await sendAppointmentReminder({
          to: client.email,
          clientName: client.full_name,
          appointmentDate,
          appointmentTime,
          therapistName: therapist.full_name,
          locationType: appointment.location_type,
          joinLink: appointment.location_type === 'online' ? 'https://meet.mindeeze.com/' : undefined,
        })
        results.push({ type: 'email', success: emailResult.success, clientId: client.id })
      }

      // Send SMS reminder
      if (client.phone) {
        const smsResult = await sendAppointmentReminderSMS({
          to: client.phone,
          clientName: client.full_name,
          appointmentDate,
          appointmentTime,
          therapistName: therapist.full_name,
        })
        results.push({ type: 'sms', success: smsResult.success, clientId: client.id })
      }

      // Mark reminder as sent
      const { error: updateError } = await supabase
        .from('appointments')
        .update({
          reminder_sent_48h: true,
          reminder_sent_at: new Date().toISOString(),
        })
        .eq('id', appointment.id)

      if (updateError) {
        results.push({ type: 'update', success: false, error: updateError.message })
      }
    }

    return new Response(
      JSON.stringify({
        message: `Processed ${appointments.length} appointment reminders`,
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
