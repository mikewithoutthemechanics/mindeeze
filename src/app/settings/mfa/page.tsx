'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useToast } from '@/components/ui/toast/ToastProvider'
import { handleError, getErrorMessage } from '@/lib/utils/errors'
import { motion } from 'framer-motion'

export default function MFAPage() {
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState<'setup' | 'verify'>('setup')
  const [qrCode, setQrCode] = useState('')
  const [secret, setSecret] = useState('')
  const [code, setCode] = useState('')
  const [mfaEnabled, setMfaEnabled] = useState(false)
  const router = useRouter()
  const [supabase] = useState(() => {
    if (typeof window !== 'undefined') {
      return createClient()
    }
    return null
  })
  const { showToast } = useToast()

  const checkMFAStatus = async () => {
    if (!supabase) return
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: factors } = await supabase.auth.mfa.listFactors()
      setMfaEnabled(!!(factors?.all && factors.all.length > 0))
    }
  }

  useEffect(() => {
    if (supabase) {
      checkMFAStatus()
    }
  }, [supabase])

  const setupMFA = async () => {
    if (!supabase) {
      setError('Unable to connect to database')
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
      })

      if (error) throw error

      setQrCode(data.totp.qr_code)
      setSecret(data.totp.secret)
      setStep('verify')
    } catch (err) {
      const appError = handleError(err)
      setError(getErrorMessage(appError))
      showToast('error', getErrorMessage(appError))
    } finally {
      setLoading(false)
    }
  }

  const verifyMFA = async () => {
    if (!code || code.length !== 6) {
      setError('Please enter a valid 6-digit code')
      return
    }

    if (!supabase) {
      setError('Unable to connect to database')
      return
    }

    setVerifying(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not found')

      const { data, error } = await supabase.auth.mfa.challenge({ factorId: 'totp' })
      if (error) throw error

      const { data: verifyData, error: verifyError } = await supabase.auth.mfa.verify({
        factorId: 'totp',
        challengeId: data.id,
        code,
      })

      if (verifyError) throw verifyError

      showToast('success', 'MFA enabled successfully')
      setMfaEnabled(true)
      setStep('setup')
      setCode('')
    } catch (err) {
      const appError = handleError(err)
      setError(getErrorMessage(appError))
      showToast('error', getErrorMessage(appError))
    } finally {
      setVerifying(false)
    }
  }

  const disableMFA = async () => {
    if (!confirm('Are you sure you want to disable MFA? This will make your account less secure.')) return

    if (!supabase) {
      setError('Unable to connect to database')
      return
    }

    setLoading(true)
    try {
      const { data: factors } = await supabase.auth.mfa.listFactors()
      if (factors?.all && factors.all.length > 0) {
        const { error } = await supabase.auth.mfa.unenroll({
          factorId: factors.all[0].id,
        })
        if (error) throw error
      }

      showToast('success', 'MFA disabled successfully')
      setMfaEnabled(false)
    } catch (err) {
      const appError = handleError(err)
      setError(getErrorMessage(appError))
      showToast('error', getErrorMessage(appError))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Link href="/settings" className="text-indigo-600 hover:text-indigo-500">
            ← Back to Settings
          </Link>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow p-6"
        >
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Two-Factor Authentication</h1>
          <p className="text-gray-600 mb-6">
            Add an extra layer of security to your account by requiring a code from your authenticator app.
          </p>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {mfaEnabled ? (
            <div className="space-y-6">
              <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="font-medium text-green-900">MFA is enabled</p>
                  <p className="text-sm text-green-700">Your account is protected with two-factor authentication</p>
                </div>
              </div>

              <button
                onClick={disableMFA}
                disabled={loading}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? 'Disabling...' : 'Disable MFA'}
              </button>
            </div>
          ) : step === 'setup' ? (
            <div className="space-y-6">
              <div className="flex items-center gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <p className="font-medium text-yellow-900">MFA is not enabled</p>
                  <p className="text-sm text-yellow-700">Enable two-factor authentication to secure your account</p>
                </div>
              </div>

              <button
                onClick={setupMFA}
                disabled={loading}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
              >
                {loading ? 'Setting up...' : 'Enable MFA'}
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Scan QR Code</h2>
                <p className="text-gray-600 mb-4">
                  Use your authenticator app (Google Authenticator, Authy, etc.) to scan this QR code
                </p>
                {qrCode && (
                  <div className="inline-block p-4 bg-white border border-gray-200 rounded-lg">
                    <img src={qrCode} alt="QR Code" className="w-48 h-48" />
                  </div>
                )}
                {secret && (
                  <p className="mt-4 text-sm text-gray-500">
                    Or enter this code manually: <code className="bg-gray-100 px-2 py-1 rounded">{secret}</code>
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">
                  Enter 6-digit code
                </label>
                <input
                  id="code"
                  type="text"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center text-2xl tracking-widest"
                />
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setStep('setup')}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={verifyMFA}
                  disabled={verifying || code.length !== 6}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                >
                  {verifying ? 'Verifying...' : 'Verify & Enable'}
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
