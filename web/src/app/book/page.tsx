'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { motion } from 'framer-motion'
import { useToast } from '@/components/ui/toast/ToastProvider'

export default function BookingPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState(1)
  const [therapists, setTherapists] = useState<any[]>([])
  const [selectedTherapist, setSelectedTherapist] = useState<any>(null)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [clientInfo, setClientInfo] = useState({
    fullName: '',
    email: '',
    phone: '',
  })
  const { showToast } = useToast()
  const [supabase] = useState(() => {
    if (typeof window !== 'undefined') {
      return createClient()
    }
    return null
  })

  useEffect(() => {
    if (supabase) {
      loadTherapists()
    }
  }, [supabase])

  const loadTherapists = async () => {
    if (!supabase) return
    const { data } = await supabase
      .from('therapists')
      .select('*, practices(*)')
      .eq('accepting_new_clients', true)
    if (data) setTherapists(data)
  }

  const updateClientInfo = (field: string, value: string) => {
    setClientInfo((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!supabase) {
      setError('Unable to connect to database')
      setLoading(false)
      return
    }

    try {
      // Create client
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .insert({
          full_name: clientInfo.fullName,
          email: clientInfo.email,
          phone: clientInfo.phone,
          status: 'active',
        })
        .select()
        .single()

      if (clientError) throw clientError

      // Create appointment
      const appointmentDate = new Date(`${selectedDate}T${selectedTime}`)
      const appointmentDateEnd = new Date(appointmentDate.getTime() + 60 * 60 * 1000) // 1 hour

      const { error: appointmentError } = await supabase
        .from('appointments')
        .insert({
          therapist_id: selectedTherapist.id,
          client_id: client.id,
          starts_at: appointmentDate.toISOString(),
          ends_at: appointmentDateEnd.toISOString(),
          session_type: 'initial',
          location_type: 'online',
          fee: selectedTherapist.practices?.default_fee || 100,
          currency: selectedTherapist.practices?.currency || 'USD',
          status: 'scheduled',
        })

      if (appointmentError) throw appointmentError

      showToast('success', 'Booking confirmed! Check your email for details.')
      setStep(4)
    } catch (err: any) {
      setError(err.message || 'An error occurred')
      showToast('error', 'Failed to book appointment')
    } finally {
      setLoading(false)
    }
  }

  const availableTimes = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00']

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            Book Your Session
          </h1>
          <p className="text-xl text-gray-600">
            Find the right therapist and schedule your appointment
          </p>
        </motion.div>

        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg"
          >
            {error}
          </motion.div>
        )}

        {/* Step 1: Select Therapist */}
        {step === 1 && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <h2 className="text-2xl font-bold text-gray-900">Choose a Therapist</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {therapists.map((therapist) => (
                <motion.div
                  key={therapist.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setSelectedTherapist(therapist)
                    setStep(2)
                  }}
                  className="bg-white rounded-2xl shadow-lg p-6 cursor-pointer hover:shadow-2xl transition-all duration-300"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                      {therapist.full_name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900">{therapist.full_name}</h3>
                      <p className="text-gray-600">{therapist.practices?.practice_name}</p>
                      <p className="text-sm text-gray-500 mt-2">{therapist.modality}</p>
                      <p className="text-sm text-indigo-600 font-medium mt-1">
                        {therapist.practices?.currency || 'USD'} {therapist.practices?.default_fee || 100}/hour
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Step 2: Select Date & Time */}
        {step === 2 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <button
              onClick={() => setStep(1)}
              className="text-indigo-600 hover:text-indigo-500 font-medium"
            >
              ← Back to therapists
            </button>
            <h2 className="text-2xl font-bold text-gray-900">Select Date & Time</h2>
            
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Available Times
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {availableTimes.map((time) => (
                    <motion.button
                      key={time}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setSelectedTime(time)}
                      className={`px-4 py-3 rounded-lg border-2 transition-all ${
                        selectedTime === time
                          ? 'bg-indigo-600 border-indigo-600 text-white'
                          : 'border-gray-200 hover:border-indigo-500 text-gray-700'
                      }`}
                    >
                      {time}
                    </motion.button>
                  ))}
                </div>
              </div>
            </div>

            {selectedDate && selectedTime && (
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => setStep(3)}
                className="w-full py-4 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
              >
                Continue
              </motion.button>
            )}
          </motion.div>
        )}

        {/* Step 3: Client Information */}
        {step === 3 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <button
              onClick={() => setStep(2)}
              className="text-indigo-600 hover:text-indigo-500 font-medium"
            >
              ← Back to date & time
            </button>
            <h2 className="text-2xl font-bold text-gray-900">Your Information</h2>

            <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={clientInfo.fullName}
                  onChange={(e) => updateClientInfo('fullName', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  value={clientInfo.email}
                  onChange={(e) => updateClientInfo('email', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone *
                </label>
                <input
                  type="tel"
                  required
                  value={clientInfo.phone}
                  onChange={(e) => updateClientInfo('phone', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Booking...' : 'Confirm Booking'}
              </button>
            </form>
          </motion.div>
        )}

        {/* Step 4: Confirmation */}
        {step === 4 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-lg p-8 text-center"
          >
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Booking Confirmed!</h2>
            <p className="text-gray-600 mb-6">
              Your appointment has been scheduled. You'll receive a confirmation email shortly.
            </p>
            <div className="bg-gray-50 rounded-lg p-6 mb-6 text-left">
              <div className="space-y-2">
                <p><span className="font-medium">Therapist:</span> {selectedTherapist?.full_name}</p>
                <p><span className="font-medium">Date:</span> {new Date(selectedDate).toLocaleDateString()}</p>
                <p><span className="font-medium">Time:</span> {selectedTime}</p>
                <p><span className="font-medium">Location:</span> Online</p>
              </div>
            </div>
            <button
              onClick={() => window.location.href = '/'}
              className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
            >
              Return Home
            </button>
          </motion.div>
        )}
      </div>
    </div>
  )
}
