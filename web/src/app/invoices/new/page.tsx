'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createPaymentIntent } from '@/lib/stripe/client'
import { createPayFastPaymentUrl, generatePayFastSignature } from '@/lib/payfast/client'
import { useToast } from '@/components/ui/toast/ToastProvider'
import { handleError, getErrorMessage } from '@/lib/utils/errors'

function NewInvoiceForm() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [clients, setClients] = useState<any[]>([])
  const [therapist, setTherapist] = useState<any>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const { showToast } = useToast()

  const [formData, setFormData] = useState({
    clientId: searchParams.get('clientId') || '',
    appointmentId: searchParams.get('appointmentId') || '',
    amount: '',
    currency: 'ZAR',
    dueDate: '',
    paymentMethod: 'stripe',
  })

  const PAYMENT_METHODS = [
    { value: 'stripe', label: 'Stripe (Credit Card)', description: 'Secure online payment via Stripe' },
    { value: 'payfast', label: 'PayFast', description: 'South African payment gateway' },
    { value: 'paypal', label: 'PayPal', description: 'PayPal payment' },
    { value: 'bank_transfer', label: 'Bank Transfer (EFT)', description: 'Direct bank transfer' },
    { value: 'cash', label: 'Cash', description: 'Cash payment in person' },
    { value: 'debit_order', label: 'Debit Order', description: 'Monthly debit order' },
  ]

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const { data: clientsData } = await supabase
      .from('clients')
      .select('id, full_name, email')
      .eq('status', 'active')
      .order('full_name')
    if (clientsData) setClients(clientsData)

    const { data: therapistData } = await supabase
      .from('therapists')
      .select('currency, practice_name')
      .eq('id', (await supabase.auth.getUser()).data.user?.id)
      .single()
    if (therapistData) {
      setTherapist(therapistData)
      setFormData((prev) => ({ ...prev, currency: therapistData.currency }))
    }
  }

  const updateFormData = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const generateInvoiceNumber = () => {
    const date = new Date()
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
    return `INV-${year}${month}-${random}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('User not authenticated')
      }

      const invoiceNumber = generateInvoiceNumber()
      const dueDate = formData.dueDate || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()

      let paymentIntentId: string | null = null
      let paymentUrl: string | null = null

      // Create payment intent based on method
      if (formData.paymentMethod === 'stripe') {
        const { clientSecret, id } = await createPaymentIntent(
          parseFloat(formData.amount),
          formData.currency
        )
        paymentIntentId = id
      } else if (formData.paymentMethod === 'payfast') {
        const payfastData = {
          merchant_id: process.env.NEXT_PUBLIC_PAYFAST_MERCHANT_ID!,
          merchant_key: process.env.NEXT_PUBLIC_PAYFAST_MERCHANT_KEY!,
          amount: parseFloat(formData.amount),
          item_name: `Invoice ${invoiceNumber}`,
          return_url: `${window.location.origin}/invoices/${invoiceNumber}/success`,
          cancel_url: `${window.location.origin}/invoices/${invoiceNumber}/cancel`,
          notify_url: `${window.location.origin}/api/payfast/notify`,
          email_address: clients.find((c) => c.id === formData.clientId)?.email,
          passphrase: process.env.NEXT_PUBLIC_PAYFAST_PASSPHRASE,
        }
        const signature = generatePayFastSignature(payfastData)
        paymentUrl = createPayFastPaymentUrl(payfastData, signature)
      }

      const { error: insertError } = await supabase
        .from('invoices')
        .insert({
          therapist_id: user.id,
          client_id: formData.clientId,
          appointment_id: formData.appointmentId || null,
          invoice_number: invoiceNumber,
          amount: parseFloat(formData.amount),
          currency: formData.currency,
          status: 'sent',
          payment_method: formData.paymentMethod,
          stripe_payment_intent_id: paymentIntentId,
          due_date: dueDate,
          sent_at: new Date().toISOString(),
        })

      if (insertError) throw insertError

      // Send invoice email
      const client = clients.find((c) => c.id === formData.clientId)
      if (client?.email) {
        await fetch('/api/send-invoice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: client.email,
            clientName: client.full_name,
            invoiceNumber,
            amount: parseFloat(formData.amount),
            currency: formData.currency,
            dueDate: new Date(dueDate).toLocaleDateString(),
            paymentUrl: paymentUrl || undefined,
          }),
        })
      }

      router.push('/invoices')
      showToast('success', 'Invoice created and sent successfully')
    } catch (err) {
      const appError = handleError(err)
      setError(getErrorMessage(appError))
      showToast('error', getErrorMessage(appError))
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Link href="/invoices" className="text-indigo-600 hover:text-indigo-500">
            ← Back to Invoices
          </Link>
          <h1 className="mt-4 text-3xl font-bold text-gray-900">Create Invoice</h1>
          <p className="mt-2 text-gray-600">Enter invoice details below</p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
          {/* Client Selection */}
          <div>
            <label htmlFor="clientId" className="block text-sm font-medium text-gray-700 mb-1">
              Client *
            </label>
            <select
              id="clientId"
              required
              value={formData.clientId}
              onChange={(e) => updateFormData('clientId', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select a client</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.full_name} {client.email ? `(${client.email})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Amount and Currency */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
                Amount *
              </label>
              <input
                id="amount"
                type="number"
                required
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={(e) => updateFormData('amount', e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-1">
                Currency *
              </label>
              <select
                id="currency"
                value={formData.currency}
                onChange={(e) => updateFormData('currency', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ZAR">ZAR - South African Rand</option>
                <option value="GBP">GBP - British Pound</option>
                <option value="AED">AED - UAE Dirham</option>
                <option value="AUD">AUD - Australian Dollar</option>
                <option value="USD">USD - US Dollar</option>
              </select>
            </div>
          </div>

          {/* Due Date */}
          <div>
            <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 mb-1">
              Due Date
            </label>
            <input
              id="dueDate"
              type="date"
              value={formData.dueDate}
              onChange={(e) => updateFormData('dueDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="mt-1 text-sm text-gray-500">Default: 14 days from today</p>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Method *
            </label>
            <div className="space-y-2">
              {PAYMENT_METHODS.map((method) => (
                <label key={method.value} className="flex items-start">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={method.value}
                    checked={formData.paymentMethod === method.value}
                    onChange={(e) => updateFormData('paymentMethod', e.target.value)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 mt-1"
                  />
                  <div className="ml-2">
                    <span className="text-sm text-gray-700 font-medium">{method.label}</span>
                    <p className="text-xs text-gray-500">{method.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end space-x-4">
            <Link
              href="/invoices"
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create & Send Invoice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function NewInvoicePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>}>
      <NewInvoiceForm />
    </Suspense>
  )
}
