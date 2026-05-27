import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'

export default async function ClientDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!client) {
    notFound()
  }

  const { data: appointments } = await supabase
    .from('appointments')
    .select('*')
    .eq('client_id', params.id)
    .order('starts_at', { ascending: false })
    .limit(10)

  const { data: invoices } = await supabase
    .from('invoices')
    .select('*')
    .eq('client_id', params.id)
    .order('created_at', { ascending: false })
    .limit(10)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Link href="/clients" className="text-indigo-600 hover:text-indigo-500">
            ← Back to Clients
          </Link>
          <div className="mt-4 flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{client.full_name}</h1>
              <p className="mt-2 text-gray-600">Client Profile</p>
            </div>
            <div className="space-x-2">
              <Link
                href={`/clients/${client.id}/edit`}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Edit
              </Link>
              <Link
                href={`/appointments/new?clientId=${client.id}`}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                Schedule Appointment
              </Link>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Client Information */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Contact Information</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="text-gray-900">{client.email || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Phone</p>
                  <p className="text-gray-900">{client.phone || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Date of Birth</p>
                  <p className="text-gray-900">{client.dob ? new Date(client.dob).toLocaleDateString() : '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    client.status === 'active' ? 'bg-green-100 text-green-800' :
                    client.status === 'waitlist' ? 'bg-yellow-100 text-yellow-800' :
                    client.status === 'on_hold' ? 'bg-orange-100 text-orange-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {client.status}
                  </span>
                </div>
              </div>

              {client.emergency_contact && (
                <div className="mt-6 pt-6 border-t">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Emergency Contact</h4>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">{client.emergency_contact.name}</p>
                    <p className="text-sm text-gray-600">{client.emergency_contact.phone}</p>
                    <p className="text-sm text-gray-600">{client.emergency_contact.relationship}</p>
                  </div>
                </div>
              )}

              {client.gp_details && (
                <div className="mt-6 pt-6 border-t">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">GP Details</h4>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">{client.gp_details.name}</p>
                    <p className="text-sm text-gray-600">{client.gp_details.practice}</p>
                    <p className="text-sm text-gray-600">{client.gp_details.phone}</p>
                  </div>
                </div>
              )}

              <div className="mt-6 pt-6 border-t">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Consent</h4>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <span className={`h-2 w-2 rounded-full mr-2 ${client.gdpr_consent_date ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <span className="text-sm text-gray-600">GDPR Consent</span>
                    {client.gdpr_consent_date && (
                      <span className="text-xs text-gray-500 ml-auto">
                        {new Date(client.gdpr_consent_date).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center">
                    <span className={`h-2 w-2 rounded-full mr-2 ${client.popia_consent_date ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <span className="text-sm text-gray-600">POPIA Consent</span>
                    {client.popia_consent_date && (
                      <span className="text-xs text-gray-500 ml-auto">
                        {new Date(client.popia_consent_date).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Appointments and Invoices */}
          <div className="lg:col-span-2 space-y-6">
            {/* Recent Appointments */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Recent Appointments</h3>
                <Link href={`/appointments?clientId=${client.id}`} className="text-indigo-600 hover:text-indigo-500 text-sm">
                  View All
                </Link>
              </div>
              {appointments && appointments.length > 0 ? (
                <div className="space-y-3">
                  {appointments.map((appointment) => (
                    <div key={appointment.id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {new Date(appointment.starts_at).toLocaleDateString()} at {new Date(appointment.starts_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </p>
                        <p className="text-sm text-gray-500">{appointment.session_type} - {appointment.location_type}</p>
                      </div>
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        appointment.status === 'completed' ? 'bg-green-100 text-green-800' :
                        appointment.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                        appointment.status === 'no_show' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {appointment.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No appointments yet</p>
              )}
            </div>

            {/* Recent Invoices */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Recent Invoices</h3>
                <Link href={`/invoices?clientId=${client.id}`} className="text-indigo-600 hover:text-indigo-500 text-sm">
                  View All
                </Link>
              </div>
              {invoices && invoices.length > 0 ? (
                <div className="space-y-3">
                  {invoices.map((invoice) => (
                    <div key={invoice.id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{invoice.invoice_number}</p>
                        <p className="text-sm text-gray-500">{new Date(invoice.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">
                          {invoice.currency.toUpperCase()} {invoice.amount.toFixed(2)}
                        </p>
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                          invoice.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                          invoice.status === 'overdue' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {invoice.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No invoices yet</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
