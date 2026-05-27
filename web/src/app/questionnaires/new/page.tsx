'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

const PHQ9_QUESTIONS = [
  'Little interest or pleasure in doing things',
  'Feeling down, depressed, or hopeless',
  'Trouble falling or staying asleep, or sleeping too much',
  'Feeling tired or having little energy',
  'Poor appetite or overeating',
  'Feeling bad about yourself - or that you are a failure',
  'Trouble concentrating on things',
  'Moving or speaking slowly, or being restless',
  'Thoughts that you would be better off dead or of hurting yourself',
]

const GAD7_QUESTIONS = [
  'Feeling nervous, anxious, or on edge',
  'Not being able to stop or control worrying',
  'Worrying too much about different things',
  'Trouble relaxing',
  'Being so restless that it is hard to sit still',
  'Becoming easily annoyed or irritable',
  'Feeling afraid, as if something awful might happen',
]

function NewQuestionnaireForm() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [clients, setClients] = useState<any[]>([])
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [formData, setFormData] = useState({
    clientId: searchParams.get('clientId') || '',
    type: 'phq9',
    phq9Scores: [0, 0, 0, 0, 0, 0, 0, 0, 0],
    gad7Scores: [0, 0, 0, 0, 0, 0, 0],
  })

  useEffect(() => {
    loadClients()
  }, [])

  const loadClients = async () => {
    const { data } = await supabase
      .from('clients')
      .select('id, full_name')
      .eq('status', 'active')
      .order('full_name')
    if (data) setClients(data)
  }

  const updateFormData = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const updateScore = (index: number, value: number, type: 'phq9' | 'gad7') => {
    if (type === 'phq9') {
      const newScores = [...formData.phq9Scores]
      newScores[index] = value
      setFormData((prev) => ({ ...prev, phq9Scores: newScores }))
    } else {
      const newScores = [...formData.gad7Scores]
      newScores[index] = value
      setFormData((prev) => ({ ...prev, gad7Scores: newScores }))
    }
  }

  const calculatePHQ9Score = () => formData.phq9Scores.reduce((sum, score) => sum + score, 0)
  const calculateGAD7Score = () => formData.gad7Scores.reduce((sum, score) => sum + score, 0)

  const getPHQ9Severity = (score: number) => {
    if (score <= 4) return 'Minimal'
    if (score <= 9) return 'Mild'
    if (score <= 14) return 'Moderate'
    return 'Severe'
  }

  const getGAD7Severity = (score: number) => {
    if (score <= 4) return 'Minimal'
    if (score <= 9) return 'Mild'
    if (score <= 14) return 'Moderate'
    return 'Severe'
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

      let scores: any = {}
      let totalScore = 0
      let severity = ''

      if (formData.type === 'phq9') {
        scores = { phq9: formData.phq9Scores }
        totalScore = calculatePHQ9Score()
        severity = getPHQ9Severity(totalScore)
      } else {
        scores = { gad7: formData.gad7Scores }
        totalScore = calculateGAD7Score()
        severity = getGAD7Severity(totalScore)
      }

      const { error: insertError } = await supabase
        .from('questionnaires')
        .insert({
          therapist_id: user.id,
          client_id: formData.clientId,
          type: formData.type,
          scores,
          total_score: totalScore,
          severity,
          completed_at: new Date().toISOString(),
        })

      if (insertError) throw insertError

      router.push(`/clients/${formData.clientId}`)
    } catch (err: any) {
      setError(err.message || 'An error occurred')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Link href="/clients" className="text-indigo-600 hover:text-indigo-500">
            ← Back to Clients
          </Link>
          <h1 className="mt-4 text-3xl font-bold text-gray-900">Questionnaire</h1>
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
                  {client.full_name}
                </option>
              ))}
            </select>
          </div>

          {/* Questionnaire Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Questionnaire Type *
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="type"
                  value="phq9"
                  checked={formData.type === 'phq9'}
                  onChange={(e) => updateFormData('type', e.target.value)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700">PHQ-9 (Depression)</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="type"
                  value="gad7"
                  checked={formData.type === 'gad7'}
                  onChange={(e) => updateFormData('type', e.target.value)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700">GAD-7 (Anxiety)</span>
              </label>
            </div>
          </div>

          {/* PHQ-9 Questions */}
          {formData.type === 'phq9' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">PHQ-9 Questions</h3>
              <p className="text-sm text-gray-600">
                Over the last 2 weeks, how often have you been bothered by the following problems?
              </p>
              {PHQ9_QUESTIONS.map((question, index) => (
                <div key={index} className="border-b pb-4">
                  <p className="text-sm font-medium text-gray-900 mb-2">{index + 1}. {question}</p>
                  <div className="flex space-x-4">
                    {[0, 1, 2, 3].map((value) => (
                      <label key={value} className="flex items-center">
                        <input
                          type="radio"
                          name={`phq9-${index}`}
                          value={value}
                          checked={formData.phq9Scores[index] === value}
                          onChange={() => updateScore(index, value, 'phq9')}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                        />
                        <span className="ml-2 text-sm text-gray-700">
                          {value === 0 ? 'Not at all' : value === 1 ? 'Several days' : value === 2 ? 'More than half the days' : 'Nearly every day'}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
              <div className="bg-indigo-50 p-4 rounded-md">
                <p className="text-sm font-medium text-indigo-900">
                  Total Score: {calculatePHQ9Score()} - {getPHQ9Severity(calculatePHQ9Score())}
                </p>
              </div>
            </div>
          )}

          {/* GAD-7 Questions */}
          {formData.type === 'gad7' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">GAD-7 Questions</h3>
              <p className="text-sm text-gray-600">
                Over the last 2 weeks, how often have you been bothered by the following problems?
              </p>
              {GAD7_QUESTIONS.map((question, index) => (
                <div key={index} className="border-b pb-4">
                  <p className="text-sm font-medium text-gray-900 mb-2">{index + 1}. {question}</p>
                  <div className="flex space-x-4">
                    {[0, 1, 2, 3].map((value) => (
                      <label key={value} className="flex items-center">
                        <input
                          type="radio"
                          name={`gad7-${index}`}
                          value={value}
                          checked={formData.gad7Scores[index] === value}
                          onChange={() => updateScore(index, value, 'gad7')}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                        />
                        <span className="ml-2 text-sm text-gray-700">
                          {value === 0 ? 'Not at all' : value === 1 ? 'Several days' : value === 2 ? 'More than half the days' : 'Nearly every day'}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
              <div className="bg-indigo-50 p-4 rounded-md">
                <p className="text-sm font-medium text-indigo-900">
                  Total Score: {calculateGAD7Score()} - {getGAD7Severity(calculateGAD7Score())}
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-4">
            <Link
              href="/clients"
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Questionnaire'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function NewQuestionnairePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>}>
      <NewQuestionnaireForm />
    </Suspense>
  )
}
