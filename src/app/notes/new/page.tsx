'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { generateAIDraft } from '@/lib/groq/client'
import VoiceDictation from '@/components/voice/VoiceDictation'
import { useToast } from '@/components/ui/toast/ToastProvider'
import { handleError, getErrorMessage } from '@/lib/utils/errors'

function NewNoteForm() {
  const [loading, setLoading] = useState(false)
  const [signing, setSigning] = useState(false)
  const [aiGenerating, setAiGenerating] = useState(false)
  const [error, setError] = useState('')
  const [appointment, setAppointment] = useState<any>(null)
  const [client, setClient] = useState<any>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const { showToast } = useToast()

  const appointmentId = searchParams.get('appointmentId')

  const [formData, setFormData] = useState({
    noteType: 'soap',
    bulletPoints: '',
    subjective: '',
    objective: '',
    assessment: '',
    plan: '',
    data: '',
    narrative: '',
  })

  useEffect(() => {
    if (appointmentId) {
      loadAppointment()
    }
  }, [appointmentId])

  const loadAppointment = async () => {
    const { data } = await supabase
      .from('appointments')
      .select('*, clients(*)')
      .eq('id', appointmentId)
      .single()

    if (data) {
      setAppointment(data)
      setClient(data.clients)
    }
  }

  const updateFormData = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleAIGenerate = async () => {
    if (!formData.bulletPoints.trim()) {
      setError('Please enter bullet points to generate AI draft')
      return
    }

    setAiGenerating(true)
    setError('')

    try {
      const bulletPoints = formData.bulletPoints
        .split('\n')
        .filter((point) => point.trim())
        .map((point) => point.trim())

      const draft = await generateAIDraft({
        bulletPoints,
        noteType: formData.noteType as 'soap' | 'dap' | 'narrative',
        context: client ? `Client: ${client.full_name}` : '',
      })

      if (formData.noteType === 'soap' && draft) {
        setFormData((prev) => ({
          ...prev,
          subjective: draft.subjective || '',
          objective: draft.objective || '',
          assessment: draft.assessment || '',
          plan: draft.plan || '',
        }))
      } else if (formData.noteType === 'dap' && draft) {
        setFormData((prev) => ({
          ...prev,
          data: draft.data || '',
          assessment: draft.assessment || '',
          plan: draft.plan || '',
        }))
      } else if (formData.noteType === 'narrative' && draft) {
        setFormData((prev) => ({
          ...prev,
          narrative: draft.narrative || '',
        }))
      }
    } catch (err) {
      const appError = handleError(err)
      setError(getErrorMessage(appError))
      showToast('error', getErrorMessage(appError))
    } finally {
      setAiGenerating(false)
    }
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
        .select('full_name')
        .eq('id', user.id)
        .single()

      let content: any = {}

      if (formData.noteType === 'soap') {
        content = {
          subjective: formData.subjective,
          objective: formData.objective,
          assessment: formData.assessment,
          plan: formData.plan,
        }
      } else if (formData.noteType === 'dap') {
        content = {
          data: formData.data,
          assessment: formData.assessment,
          plan: formData.plan,
        }
      } else {
        content = {
          narrative: formData.narrative,
        }
      }

      const { error: insertError } = await supabase
        .from('session_notes')
        .insert({
          appointment_id: appointmentId,
          therapist_id: user.id,
          client_id: client?.id,
          note_type: formData.noteType,
          content,
          signed_at: new Date().toISOString(),
          signed_by: therapist?.full_name || user.email,
        })

      if (insertError) throw insertError

      // Update appointment status to completed
      await supabase
        .from('appointments')
        .update({ status: 'completed' })
        .eq('id', appointmentId)

      router.push('/appointments')
      showToast('success', 'Session note saved successfully')
    } catch (err) {
      const appError = handleError(err)
      setError(getErrorMessage(appError))
      showToast('error', getErrorMessage(appError))
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Link href="/appointments" className="text-indigo-600 hover:text-indigo-500">
            ← Back to Appointments
          </Link>
          <h1 className="mt-4 text-3xl font-bold text-gray-900">Session Note</h1>
          {client && (
            <p className="mt-2 text-gray-600">
              Client: {client.full_name} | {appointment && new Date(appointment.starts_at).toLocaleDateString()}
            </p>
          )}
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
          {/* AI Drafting Section */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-md p-4">
            <h3 className="text-sm font-medium text-indigo-900 mb-2">AI-Assisted Note Drafting</h3>
            <p className="text-xs text-indigo-700 mb-3">
              Enter bullet points from your session and let AI help structure your note. Always review and edit before signing.
            </p>
            
            <VoiceDictation 
              onTranscript={(text) => updateFormData('bulletPoints', formData.bulletPoints + (formData.bulletPoints ? '\n' : '') + text)}
              placeholder="Tap to dictate session notes..."
            />
            
            <textarea
              value={formData.bulletPoints}
              onChange={(e) => updateFormData('bulletPoints', e.target.value)}
              placeholder="Or type bullet points from your session (one per line)..."
              rows={4}
              className="w-full mt-4 px-3 py-2 border border-indigo-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
            <button
              type="button"
              onClick={handleAIGenerate}
              disabled={aiGenerating || !formData.bulletPoints.trim()}
              className="mt-2 px-4 py-2 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {aiGenerating ? 'Generating...' : 'Generate AI Draft'}
            </button>
          </div>

          {/* Note Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Note Type *
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="noteType"
                  value="soap"
                  checked={formData.noteType === 'soap'}
                  onChange={(e) => updateFormData('noteType', e.target.value)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700">SOAP</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="noteType"
                  value="dap"
                  checked={formData.noteType === 'dap'}
                  onChange={(e) => updateFormData('noteType', e.target.value)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700">DAP</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="noteType"
                  value="narrative"
                  checked={formData.noteType === 'narrative'}
                  onChange={(e) => updateFormData('noteType', e.target.value)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700">Narrative</span>
              </label>
            </div>
          </div>

          {/* SOAP Note */}
          {formData.noteType === 'soap' && (
            <div className="space-y-4">
              <div>
                <label htmlFor="subjective" className="block text-sm font-medium text-gray-700 mb-1">
                  Subjective - Client's reported feelings, thoughts, and experiences *
                </label>
                <textarea
                  id="subjective"
                  required
                  rows={4}
                  value={formData.subjective}
                  onChange={(e) => updateFormData('subjective', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="What the client said, how they felt, their perspective..."
                />
              </div>
              <div>
                <label htmlFor="objective" className="block text-sm font-medium text-gray-700 mb-1">
                  Objective - Observable behaviors and therapist observations *
                </label>
                <textarea
                  id="objective"
                  required
                  rows={4}
                  value={formData.objective}
                  onChange={(e) => updateFormData('objective', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="What you observed, behaviors, affect, appearance..."
                />
              </div>
              <div>
                <label htmlFor="assessment" className="block text-sm font-medium text-gray-700 mb-1">
                  Assessment - Clinical impression and formulation *
                </label>
                <textarea
                  id="assessment"
                  required
                  rows={4}
                  value={formData.assessment}
                  onChange={(e) => updateFormData('assessment', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Your clinical assessment, progress, patterns identified..."
                />
              </div>
              <div>
                <label htmlFor="plan" className="block text-sm font-medium text-gray-700 mb-1">
                  Plan - Next steps and homework assignments *
                </label>
                <textarea
                  id="plan"
                  required
                  rows={4}
                  value={formData.plan}
                  onChange={(e) => updateFormData('plan', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Treatment plan, homework, next session focus..."
                />
              </div>
            </div>
          )}

          {/* DAP Note */}
          {formData.noteType === 'dap' && (
            <div className="space-y-4">
              <div>
                <label htmlFor="data" className="block text-sm font-medium text-gray-700 mb-1">
                  Data - What happened in the session, client statements *
                </label>
                <textarea
                  id="data"
                  required
                  rows={4}
                  value={formData.data}
                  onChange={(e) => updateFormData('data', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Session content, key statements, interventions used..."
                />
              </div>
              <div>
                <label htmlFor="assessment" className="block text-sm font-medium text-gray-700 mb-1">
                  Assessment - Clinical interpretation and progress *
                </label>
                <textarea
                  id="assessment"
                  required
                  rows={4}
                  value={formData.assessment}
                  onChange={(e) => updateFormData('assessment', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Clinical interpretation, progress assessment..."
                />
              </div>
              <div>
                <label htmlFor="plan" className="block text-sm font-medium text-gray-700 mb-1">
                  Plan - Future treatment direction *
                </label>
                <textarea
                  id="plan"
                  required
                  rows={4}
                  value={formData.plan}
                  onChange={(e) => updateFormData('plan', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Treatment direction, next steps..."
                />
              </div>
            </div>
          )}

          {/* Narrative Note */}
          {formData.noteType === 'narrative' && (
            <div>
              <label htmlFor="narrative" className="block text-sm font-medium text-gray-700 mb-1">
                Narrative Note *
              </label>
              <textarea
                id="narrative"
                required
                rows={12}
                value={formData.narrative}
                onChange={(e) => updateFormData('narrative', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Freeform narrative summary of the session..."
              />
            </div>
          )}

          {/* Signing Information */}
          <div className="border-t pt-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4">
              <p className="text-sm text-yellow-800">
                <strong>Important:</strong> By signing this note, you confirm that the information is accurate and complete. 
                Once signed, the note will be locked after 48 hours.
              </p>
            </div>
            <div className="flex items-center">
              <input
                id="confirmSign"
                type="checkbox"
                required
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="confirmSign" className="ml-2 block text-sm text-gray-700">
                I confirm this note is accurate and complete. I understand it will be signed with my digital signature.
              </label>
            </div>
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
              {loading ? 'Saving...' : 'Save & Sign Note'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function NewNotePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>}>
      <NewNoteForm />
    </Suspense>
  )
}
