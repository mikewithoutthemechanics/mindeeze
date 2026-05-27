import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'

export default async function InvoiceDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: invoice } = await supabase
    .from('invoices')
    .select('*, clients(*), appointments(*)')
    .eq('id', params.id)
    .single()

  if (!invoice) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Link href="/invoices" className="text-indigo-600 hover:text-indigo-500">
            ← Back to Invoices
          </Link>
          <div className="mt-4 flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Invoice {invoice.invoice_number}</h1>
              <p className="mt-2 text-gray-600">
                Created on {new Date(invoice.created_at).toLocaleDateString()}
              </p>
            </div>
            <div className="space-x-2">
              {invoice.status === 'sent' && (
                <button className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
                  Send Reminder
                </button>
              )}
              {invoice.status === 'paid' && (
                <button className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">
                  Download PDF
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Bill To</h3>
              <div className="space-y-2">
                <p className="text-gray-900 font-medium">{invoice.clients?.full_name}</p>
                <p className="text-gray-600">{invoice.clients?.email}</p>
                <p className="text-gray-600">{invoice.clients?.phone}</p>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Invoice Details</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Invoice Number</span>
                  <span className="text-gray-900">{invoice.invoice_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Date</span>
                  <span className="text-gray-900">{new Date(invoice.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Due Date</span>
                  <span className="text-gray-900">{invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status</span>
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
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Line Items</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b">
                <div>
                  <p className="text-gray-900 font-medium">
                    {invoice.appointments ? `Session - ${new Date(invoice.appointments.starts_at).toLocaleDateString()}` : 'Professional Services'}
                  </p>
                  <p className="text-sm text-gray-500">
                    {invoice.appointments ? `${invoice.appointments.session_type} session` : 'Therapy services'}
                  </p>
                </div>
                <p className="text-gray-900 font-medium">
                  {invoice.currency.toUpperCase()} {invoice.amount.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          <div className="border-t pt-6 mt-6">
            <div className="flex justify-between items-center">
              <span className="text-lg font-medium text-gray-900">Total</span>
              <span className="text-2xl font-bold text-gray-900">
                {invoice.currency.toUpperCase()} {invoice.amount.toFixed(2)}
              </span>
            </div>
          </div>

          {invoice.payment_method && (
            <div className="border-t pt-6 mt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Payment Method</h3>
              <p className="text-gray-900 capitalize">{invoice.payment_method}</p>
            </div>
          )}

          {invoice.stripe_payment_intent_id && (
            <div className="border-t pt-6 mt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Payment Information</h3>
              <p className="text-sm text-gray-600">Stripe Payment Intent ID: {invoice.stripe_payment_intent_id}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
