'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useToast } from '@/components/ui/toast/ToastProvider'
import { handleError, getErrorMessage } from '@/lib/utils/errors'

const SESSION_TYPES = ['individual', 'couple', 'family', 'group']
const LOCATION_TYPES = ['in_person', 'online', 'phone']
const DURATIONS = [30, 45, 60, 75, 90, 120]

function NewAppointmentForm() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [clients, setClients] = useState<any[]>([])
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const { showToast } = useToast()

  const [formData, setFormData] = useState({
    clientId: searchParams.get('clientId') || '',
    date: '',
    time: '',
    duration: 60,
    sessionType: 'individual',
    locationType: 'in_person',
    locationDetails: '',
    fee: '',
    recurring: false,
    recurringFrequency: 'weekly',
    recurringCount: 4,
  })

  useEffect(() => {
    loadClients()
  }, [])

  const loadClients = async () => {
    const { data } = await supabase
      .from('clients')
      .select('id, full_name, email')
      .eq('status', 'active')
      .order('full_name')
    if (data) setClients(data)
  }

  const updateFormData = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
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

      const { data: therapist } = await supabase
        .from('therapists')
        .select('currency')
        .eq('id', user.id)
        .single()

      const currency = therapist?.currency || 'ZAR'
      const startsAt = new Date(`${formData.date}T${formData.time}`)
      const endsAt = new Date(startsAt.getTime() + formData.duration * 60000)

      if (formData.recurring) {
        // Create recurring appointments
        const appointments = []
        for (let i = 0; i < formData.recurringCount; i++) {
          const appointmentStart = new Date(startsAt)
          const appointmentEnd = new Date(endsAt)

          if (formData.recurringFrequency === 'weekly') {
            appointmentStart.setDate(appointmentStart.getDate() + (i * 7))
            appointmentEnd.setDate(appointmentEnd.getDate() + (i * 7))
          } else if (formData.recurringFrequency === 'fortnightly') {
            appointmentStart.setDate(appointmentStart.getDate() + (i * 14))
            appointmentEnd.setDate(appointmentEnd.getDate() + (i * 14))
          } else if (formData.recurringFrequency === 'monthly') {
            appointmentStart.setMonth(appointmentStart.getMonth() + i)
            appointmentEnd.setMonth(appointmentEnd.getMonth() + i)
          }

          appointments.push({
            therapist_id: user.id,
            client_id: formData.clientId,
            starts_at: appointmentStart.toISOString(),
            ends_at: appointmentEnd.toISOString(),
            session_type: formData.sessionType,
            location_type: formData.locationType,
            location_details: formData.locationDetails || null,
            fee: parseFloat(formData.fee),
            currency,
            status: 'scheduled',
          })
        }

        const { error: insertError } = await supabase
          .from('appointments')
          .insert(appointments)

        if (insertError) throw insertError
      } else {
        // Single appointment
        const { error: insertError } = await supabase
          .from('appointments')
          .insert({
            therapist_id: user.id,
            client_id: formData.clientId,
            starts_at: startsAt.toISOString(),
            ends_at: endsAt.toISOString(),
            session_type: formData.sessionType,
            location_type: formData.locationType,
            location_details: formData.locationDetails || null,
            fee: parseFloat(formData.fee),
            currency,
            status: 'scheduled',
          })

        if (insertError) throw insertError
      }

      router.push('/appointments')
      showToast('success', 'Appointment scheduled successfully')
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
          <Link href="/appointments" className="text-indigo-600 hover:text-indigo-500">
            ← Back to Appointments
          </Link>
          <h1 className="mt-4 text-3xl font-bold text-gray-900">Schedule Appointment</h1>
          <p className="mt-2 text-gray-600">Enter appointment details below</p>
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

          {/* Date and Time */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
                Date *
              </label>
              <input
                id="date"
                type="date"
                required
                value={formData.date}
                onChange={(e) => updateFormData('date', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label htmlFor="time" className="block text-sm font-medium text-gray-700 mb-1">
                Time *
              </label>
              <input
                id="time"
                type="time"
                required
                value={formData.time}
                onChange={(e) => updateFormData('time', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-1">
                Duration (minutes) *
              </label>
              <select
                id="duration"
                value={formData.duration}
                onChange={(e) => updateFormData('duration', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {DURATIONS.map((duration) => (
                  <option key={duration} value={duration}>
                    {duration} min
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Session Type and Location */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="sessionType" className="block text-sm font-medium text-gray-700 mb-1">
                Session Type *
              </label>
              <select
                id="sessionType"
                value={formData.sessionType}
                onChange={(e) => updateFormData('sessionType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {SESSION_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="locationType" className="block text-sm font-medium text-gray-700 mb-1">
                Location Type *
              </label>
              <select
                id="locationType"
                value={formData.locationType}
                onChange={(e) => updateFormData('locationType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {LOCATION_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type.replace('_', ' ').charAt(0).toUpperCase() + type.replace('_', ' ').slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Location Details */}
          {formData.locationType === 'in_person' && (
            <div>
              <label htmlFor="locationDetails" className="block text-sm font-medium text-gray-700 mb-1">
                Location Details
              </label>
              <input
                id="locationDetails"
                type="text"
                value={formData.locationDetails}
                onChange={(e) => updateFormData('locationDetails', e.target.value)}
                placeholder="e.g., Office address, room number"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}

          {/* Fee */}
          <div>
            <label htmlFor="fee" className="block text-sm font-medium text-gray-700 mb-1">
              Fee *
            </label>
            <input
              id="fee"
              type="number"
              required
              step="0.01"
              min="0"
              value={formData.fee}
              onChange={(e) => updateFormData('fee', e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Recurring Options */}
          <div className="border-t pt-6">
            <div className="flex items-center mb-4">
              <input
                id="recurring"
                type="checkbox"
                checked={formData.recurring}
                onChange={(e) => updateFormData('recurring', e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="recurring" className="ml-2 block text-sm font-medium text-gray-700">
                Recurring appointment
              </label>
            </div>

            {formData.recurring && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="recurringFrequency" className="block text-sm font-medium text-gray-700 mb-1">
                    Frequency
                  </label>
                  <select
                    id="recurringFrequency"
                    value={formData.recurringFrequency}
                    onChange={(e) => updateFormData('recurringFrequency', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="weekly">Weekly</option>
                    <option value="fortnightly">Fortnightly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="recurringCount" className="block text-sm font-medium text-gray-700 mb-1">
                    Number of sessions
                  </label>
                  <input
                    id="recurringCount"
                    type="number"
                    min="2"
                    max="52"
                    value={formData.recurringCount}
                    onChange={(e) => updateFormData('recurringCount', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-4">
            <Link
              href="/appointments"
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? 'Scheduling...' : 'Schedule Appointment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function NewAppointmentPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>}>
      <NewAppointmentForm />
    </Suspense>
  )
}
