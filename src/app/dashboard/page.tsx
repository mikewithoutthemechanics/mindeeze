import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get current month's start and end
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString()

  // Get invoices for current month
  const { data: invoices } = await supabase
    .from('invoices')
    .select('*')
    .gte('created_at', monthStart)
    .lte('created_at', monthEnd)

  // Get appointments for today
  const todayStart = new Date(now.setHours(0, 0, 0, 0)).toISOString()
  const todayEnd = new Date(now.setHours(23, 59, 59, 999)).toISOString()
  const { data: todayAppointments } = await supabase
    .from('appointments')
    .select('*, clients(full_name)')
    .gte('starts_at', todayStart)
    .lte('starts_at', todayEnd)
    .eq('status', 'scheduled')

  // Get total clients
  const { count: totalClients } = await supabase
    .from('clients')
    .select('*', { count: 'exact', head: true })

  // Calculate income metrics
  const totalBilled = invoices?.reduce((sum, inv) => sum + inv.amount, 0) || 0
  const totalCollected = invoices?.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + inv.amount, 0) || 0
  const outstanding = invoices?.filter(inv => inv.status === 'sent' || inv.status === 'overdue').reduce((sum, inv) => sum + inv.amount, 0) || 0
  const currency = invoices?.[0]?.currency || 'ZAR'

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-gray-600">
            Welcome to MindEeze • {now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* Income Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Total Billed</h3>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {currency.toUpperCase()} {totalBilled.toFixed(2)}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Total Collected</h3>
            <p className="mt-2 text-3xl font-bold text-green-600">
              {currency.toUpperCase()} {totalCollected.toFixed(2)}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Outstanding</h3>
            <p className="mt-2 text-3xl font-bold text-orange-600">
              {currency.toUpperCase()} {outstanding.toFixed(2)}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Total Clients</h3>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {totalClients || 0}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Today's Schedule */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Today's Schedule</h3>
              <Link href="/appointments" className="text-indigo-600 hover:text-indigo-500 text-sm">
                View All
              </Link>
            </div>
            {todayAppointments && todayAppointments.length > 0 ? (
              <div className="space-y-3">
                {todayAppointments.map((apt: any) => (
                  <div key={apt.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{apt.clients?.full_name}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(apt.starts_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {apt.session_type}
                      </p>
                    </div>
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                      {apt.location_type}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No appointments scheduled for today</p>
            )}
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <Link
                href="/clients/new"
                className="block w-full text-center px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Add New Client
              </Link>
              <Link
                href="/appointments/new"
                className="block w-full text-center px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Schedule Appointment
              </Link>
              <Link
                href="/invoices/new"
                className="block w-full text-center px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Create Invoice
              </Link>
            </div>
          </div>
        </div>

        {/* Recent Invoices */}
        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Recent Invoices</h3>
            <Link href="/invoices" className="text-indigo-600 hover:text-indigo-500 text-sm">
              View All
            </Link>
          </div>
          {invoices && invoices.length > 0 ? (
            <div className="space-y-3">
              {invoices.slice(0, 5).map((invoice) => (
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
            <p className="text-sm text-gray-500">No invoices this month</p>
          )}
        </div>
      </div>
    </div>
  )
}
