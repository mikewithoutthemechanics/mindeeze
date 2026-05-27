import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'

export default async function AppointmentDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: appointment } = await supabase
    .from('appointments')
    .select('*, clients(*), therapists(*)')
    .eq('id', params.id)
    .single()

  if (!appointment) {
    notFound()
  }

  const { data: sessionNote } = await supabase
    .from('session_notes')
    .select('*')
    .eq('appointment_id', params.id)
    .single()

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Link href="/appointments" className="text-indigo-600 hover:text-indigo-500">
            ← Back to Appointments
          </Link>
          <div className="mt-4 flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Appointment Details</h1>
              <p className="mt-2 text-gray-600">
                {new Date(appointment.starts_at).toLocaleDateString()} at {new Date(appointment.starts_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </p>
            </div>
            <div className="space-x-2">
              {appointment.status === 'scheduled' && (
                <>
                  <Link
                    href={`/appointments/${appointment.id}/edit`}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Edit
                  </Link>
                  <Link
                    href={`/notes/new?appointmentId=${appointment.id}`}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                  >
                    Create Note
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Appointment Details */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Appointment Information</h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Client</p>
                <p className="text-gray-900 font-medium">{appointment.clients?.full_name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Date & Time</p>
                <p className="text-gray-900">
                  {new Date(appointment.starts_at).toLocaleDateString()} at {new Date(appointment.starts_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Duration</p>
                <p className="text-gray-900">
                  {Math.round((new Date(appointment.ends_at).getTime() - new Date(appointment.starts_at).getTime()) / 60000)} minutes
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Session Type</p>
                <p className="text-gray-900">{appointment.session_type}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Location</p>
                <p className="text-gray-900">{appointment.location_type}</p>
                {appointment.location_details && (
                  <p className="text-sm text-gray-600 mt-1">{appointment.location_details}</p>
                )}
              </div>
              <div>
                <p className="text-sm text-gray-500">Fee</p>
                <p className="text-gray-900">{appointment.currency.toUpperCase()} {appointment.fee.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                  appointment.status === 'completed' ? 'bg-green-100 text-green-800' :
                  appointment.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                  appointment.status === 'no_show' ? 'bg-red-100 text-red-800' :
                  appointment.status === 'cancelled' ? 'bg-gray-100 text-gray-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {appointment.status}
                </span>
              </div>
            </div>
          </div>

          {/* Session Note */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Session Note</h3>
            {sessionNote ? (
              <div>
                <div className="mb-4">
                  <p className="text-sm text-gray-500">Note Type</p>
                  <p className="text-gray-900 uppercase">{sessionNote.note_type}</p>
                </div>
                <div className="mb-4">
                  <p className="text-sm text-gray-500">Signed By</p>
                  <p className="text-gray-900">{sessionNote.signed_by}</p>
                </div>
                <div className="mb-4">
                  <p className="text-sm text-gray-500">Signed At</p>
                  <p className="text-gray-900">{new Date(sessionNote.signed_at).toLocaleString()}</p>
                </div>
                <Link
                  href={`/notes/${sessionNote.id}`}
                  className="text-indigo-600 hover:text-indigo-500 text-sm"
                >
                  View Full Note →
                </Link>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">No session note created yet</p>
                {appointment.status === 'scheduled' && (
                  <Link
                    href={`/notes/new?appointmentId=${appointment.id}`}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm"
                  >
                    Create Note
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
