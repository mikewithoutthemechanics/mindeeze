'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const CURRENCIES = [
  { code: 'ZAR', name: 'South African Rand (R)', symbol: 'R' },
  { code: 'GBP', name: 'British Pound (£)', symbol: '£' },
  { code: 'AED', name: 'UAE Dirham (د.إ)', symbol: 'د.إ' },
  { code: 'AUD', name: 'Australian Dollar ($)', symbol: '$' },
  { code: 'USD', name: 'US Dollar ($)', symbol: '$' },
]

const TIMEZONES = [
  'Africa/Johannesburg',
  'Europe/London',
  'Asia/Dubai',
  'Australia/Sydney',
  'America/New_York',
  'America/Los_Angeles',
]

const MODALITIES = [
  'Clinical Psychology',
  'Counselling Psychology',
  'Psychiatry',
  'Social Work',
  'Occupational Therapy',
  'Coaching',
  'Other',
]

const REGIONS = [
  { code: 'ZA', name: 'South Africa' },
  { code: 'UK', name: 'United Kingdom' },
  { code: 'UAE', name: 'United Arab Emirates' },
  { code: 'AU', name: 'Australia' },
  { code: 'US', name: 'United States' },
  { code: 'OTHER', name: 'Other' },
]

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const [supabase] = useState(() => {
    if (typeof window !== 'undefined') {
      return createClient()
    }
    return null
  })

  const [formData, setFormData] = useState({
    practiceName: '',
    currency: 'ZAR',
    timezone: 'Africa/Johannesburg',
    modality: '',
    regulatoryRegion: 'ZA',
  })

  const updateFormData = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError('')

    if (!supabase) {
      setError('Unable to connect to database')
      setLoading(false)
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('User not authenticated')
      }

      // Update therapist profile
      const { error: updateError } = await supabase
        .from('therapists')
        .update({
          practice_name: formData.practiceName,
          currency: formData.currency,
          timezone: formData.timezone,
          regulatory_region: formData.regulatoryRegion,
        })
        .eq('id', user.id)

      if (updateError) {
        // If therapist record doesn't exist, create it
        const { error: insertError } = await supabase
          .from('therapists')
          .insert({
            id: user.id,
            email: user.email!,
            full_name: user.user_metadata.full_name || '',
            practice_name: formData.practiceName,
            currency: formData.currency,
            timezone: formData.timezone,
            regulatory_region: formData.regulatoryRegion,
          })

        if (insertError) throw insertError
      }

      // Create practice
      const { data: practice, error: practiceError } = await supabase
        .from('practices')
        .insert({
          owner_id: user.id,
          name: formData.practiceName,
          country: formData.regulatoryRegion,
        })
        .select()
        .single()

      if (practiceError) throw practiceError

      router.push('/dashboard')
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'An error occurred')
      setLoading(false)
    }
  }

  const nextStep = () => {
    if (step < 5) setStep(step + 1)
  }

  const prevStep = () => {
    if (step > 1) setStep(step - 1)
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Welcome to MindEeze</h1>
          <p className="mt-2 text-gray-600">Let's set up your practice in 5 simple steps</p>
        </div>

        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex justify-between mb-2">
            {[1, 2, 3, 4, 5].map((s) => (
              <div
                key={s}
                className={`h-2 flex-1 mx-1 rounded ${
                  s <= step ? 'bg-indigo-600' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>Practice</span>
            <span>Currency</span>
            <span>Timezone</span>
            <span>Modality</span>
            <span>Region</span>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Step 1: Practice Name */}
        {step === 1 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Step 1: Practice Name</h2>
            <div>
              <label htmlFor="practiceName" className="block text-sm font-medium text-gray-700 mb-2">
                What is your practice name?
              </label>
              <input
                id="practiceName"
                type="text"
                value={formData.practiceName}
                onChange={(e) => updateFormData('practiceName', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g., Dr. Sarah Smith Psychology"
              />
            </div>
          </div>
        )}

        {/* Step 2: Currency */}
        {step === 2 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Step 2: Currency</h2>
            <div>
              <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-2">
                What currency do you use for billing?
              </label>
              <select
                id="currency"
                value={formData.currency}
                onChange={(e) => updateFormData('currency', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {CURRENCIES.map((currency) => (
                  <option key={currency.code} value={currency.code}>
                    {currency.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Step 3: Timezone */}
        {step === 3 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Step 3: Timezone</h2>
            <div>
              <label htmlFor="timezone" className="block text-sm font-medium text-gray-700 mb-2">
                What is your timezone?
              </label>
              <select
                id="timezone"
                value={formData.timezone}
                onChange={(e) => updateFormData('timezone', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Step 4: Modality */}
        {step === 4 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Step 4: Modality</h2>
            <div>
              <label htmlFor="modality" className="block text-sm font-medium text-gray-700 mb-2">
                What is your primary modality?
              </label>
              <select
                id="modality"
                value={formData.modality}
                onChange={(e) => updateFormData('modality', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select your modality</option>
                {MODALITIES.map((modality) => (
                  <option key={modality} value={modality}>
                    {modality}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Step 5: Regulatory Region */}
        {step === 5 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Step 5: Regulatory Region</h2>
            <div>
              <label htmlFor="regulatoryRegion" className="block text-sm font-medium text-gray-700 mb-2">
                Which regulatory region applies to your practice?
              </label>
              <select
                id="regulatoryRegion"
                value={formData.regulatoryRegion}
                onChange={(e) => updateFormData('regulatoryRegion', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {REGIONS.map((region) => (
                  <option key={region.code} value={region.code}>
                    {region.name}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-sm text-gray-500">
                This helps us ensure compliance with local data protection regulations (GDPR, POPIA, etc.)
              </p>
            </div>
          </div>
        )}

        {/* Navigation buttons */}
        <div className="mt-6 flex justify-between">
          <button
            onClick={prevStep}
            disabled={step === 1}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          {step < 5 ? (
            <button
              onClick={nextStep}
              disabled={
                (step === 1 && !formData.practiceName) ||
                (step === 4 && !formData.modality)
              }
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Setting up...' : 'Complete Setup'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
