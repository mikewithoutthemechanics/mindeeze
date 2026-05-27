'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useToast } from '@/components/ui/toast/ToastProvider'
import { handleError, getErrorMessage } from '@/lib/utils/errors'
import { motion } from 'framer-motion'

export default function AuditTrailPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [logs, setLogs] = useState<any[]>([])
  const [filter, setFilter] = useState('all')
  const router = useRouter()
  const [supabase] = useState(() => {
    if (typeof window !== 'undefined') {
      return createClient()
    }
    return null
  })
  const { showToast } = useToast()

  useEffect(() => {
    if (supabase) {
      loadAuditLogs()
    }
  }, [filter, supabase])

  const loadAuditLogs = async () => {
    if (!supabase) return

    setLoading(true)
    try {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)

      if (filter !== 'all') {
        query = query.eq('action_type', filter)
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError

      setLogs(data || [])
    } catch (err) {
      const appError = handleError(err)
      setError(getErrorMessage(appError))
      showToast('error', getErrorMessage(appError))
    } finally {
      setLoading(false)
    }
  }

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'create':
        return '➕'
      case 'update':
        return '✏️'
      case 'delete':
        return '🗑️'
      case 'view':
        return '👁️'
      case 'export':
        return '📤'
      case 'login':
        return '🔐'
      case 'logout':
        return '🚪'
      default:
        return '📋'
    }
  }

  const getActionColor = (actionType: string) => {
    switch (actionType) {
      case 'create':
        return 'bg-green-100 text-green-800'
      case 'update':
        return 'bg-blue-100 text-blue-800'
      case 'delete':
        return 'bg-red-100 text-red-800'
      case 'view':
        return 'bg-gray-100 text-gray-800'
      case 'export':
        return 'bg-purple-100 text-purple-800'
      case 'login':
        return 'bg-indigo-100 text-indigo-800'
      case 'logout':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const exportLogs = async () => {
    if (!supabase) {
      showToast('error', 'Unable to connect to database')
      return
    }

    try {
      const { data } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })

      if (!data) return

      const csv = [
        ['Timestamp', 'User', 'Action', 'Entity', 'Entity ID', 'IP Address', 'Details'].join(','),
        ...data.map(log => [
          log.created_at,
          log.user_email || 'System',
          log.action_type,
          log.entity_type,
          log.entity_id,
          log.ip_address || 'N/A',
          `"${log.details || ''}"`,
        ].join(','))
      ].join('\n')

      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `audit-trail-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)

      showToast('success', 'Audit logs exported successfully')
    } catch (err) {
      const appError = handleError(err)
      setError(getErrorMessage(appError))
      showToast('error', getErrorMessage(appError))
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Link href="/settings" className="text-indigo-600 hover:text-indigo-500">
            ← Back to Settings
          </Link>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Audit Trail</h1>
              <p className="mt-2 text-gray-600">Track all system activities for compliance</p>
            </div>
            <button
              onClick={exportLogs}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              Export CSV
            </button>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Filters */}
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-md ${
                  filter === 'all' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('create')}
                className={`px-4 py-2 rounded-md ${
                  filter === 'create' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Create
              </button>
              <button
                onClick={() => setFilter('update')}
                className={`px-4 py-2 rounded-md ${
                  filter === 'update' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Update
              </button>
              <button
                onClick={() => setFilter('delete')}
                className={`px-4 py-2 rounded-md ${
                  filter === 'delete' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Delete
              </button>
              <button
                onClick={() => setFilter('view')}
                className={`px-4 py-2 rounded-md ${
                  filter === 'view' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                View
              </button>
              <button
                onClick={() => setFilter('login')}
                className={`px-4 py-2 rounded-md ${
                  filter === 'login' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Login
              </button>
            </div>
          </div>

          {/* Audit Logs */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-gray-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                Loading audit logs...
              </div>
            ) : logs.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                No audit logs found
              </div>
            ) : (
              <div className="divide-y">
                {logs.map((log, index) => (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className="px-6 py-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      <div className="text-2xl">{getActionIcon(log.action_type)}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-1 text-xs font-medium rounded ${getActionColor(log.action_type)}`}>
                            {log.action_type.toUpperCase()}
                          </span>
                          <span className="text-sm text-gray-500">
                            {new Date(log.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="font-medium text-gray-900">
                          {log.user_email || 'System'} {log.action_type} {log.entity_type}
                          {log.entity_id && ` #${log.entity_id}`}
                        </p>
                        {log.details && (
                          <p className="text-sm text-gray-600 mt-1">{log.details}</p>
                        )}
                        {log.ip_address && (
                          <p className="text-xs text-gray-400 mt-1">IP: {log.ip_address}</p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
