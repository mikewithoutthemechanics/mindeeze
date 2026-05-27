'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { motion } from 'framer-motion'
import { useToast } from '@/components/ui/toast/ToastProvider'
import Link from 'next/link'

export default function WaitlistPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [waitlistClients, setWaitlistClients] = useState<any[]>([])
  const { showToast } = useToast()
  const [supabase] = useState(() => {
    if (typeof window !== 'undefined') {
      return createClient()
    }
    return null
  })

  useEffect(() => {
    if (supabase) {
      loadWaitlist()
    }
  }, [supabase])

  const loadWaitlist = async () => {
    if (!supabase) return
    const { data } = await supabase
      .from('clients')
      .select('*')
      .eq('status', 'waitlist')
      .order('created_at', { ascending: true })
    if (data) setWaitlistClients(data)
  }

  const moveToActive = async (clientId: string) => {
    if (!supabase) {
      setError('Unable to connect to database')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase
        .from('clients')
        .update({ status: 'active' })
        .eq('id', clientId)

      if (error) throw error

      showToast('success', 'Client moved to active list')
      loadWaitlist()
    } catch (err: any) {
      setError(err.message || 'An error occurred')
      showToast('error', 'Failed to update client status')
    } finally {
      setLoading(false)
    }
  }

  const removeClient = async (clientId: string) => {
    if (!confirm('Are you sure you want to remove this client from the waitlist?')) return

    if (!supabase) {
      setError('Unable to connect to database')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', clientId)

      if (error) throw error

      showToast('success', 'Client removed from waitlist')
      loadWaitlist()
    } catch (err: any) {
      setError(err.message || 'An error occurred')
      showToast('error', 'Failed to remove client')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Link href="/clients" className="text-indigo-600 hover:text-indigo-500">
            ← Back to Clients
          </Link>
          <h1 className="mt-4 text-3xl font-bold text-gray-900">Waitlist Management</h1>
          <p className="mt-2 text-gray-600">
            Manage clients waiting for availability
          </p>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg"
          >
            {error}
          </motion.div>
        )}

        {waitlistClients.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg shadow p-12 text-center"
          >
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No clients on waitlist</h3>
            <p className="text-gray-600">Your waitlist is currently empty</p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg shadow overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {waitlistClients.length} {waitlistClients.length === 1 ? 'Client' : 'Clients'} on Waitlist
              </h2>
            </div>
            <div className="divide-y">
              {waitlistClients.map((client, index) => (
                <motion.div
                  key={client.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="px-6 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-white font-bold">
                        {client.full_name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{client.full_name}</h3>
                        <p className="text-sm text-gray-500">
                          {client.email} • {client.phone}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          Added {new Date(client.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => moveToActive(client.id)}
                        disabled={loading}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                      >
                        Accept
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => removeClient(client.id)}
                        disabled={loading}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                      >
                        Remove
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
