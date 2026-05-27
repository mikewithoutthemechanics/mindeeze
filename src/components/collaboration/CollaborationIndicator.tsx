'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { RealtimeChannel } from '@supabase/supabase-js'
import { motion, AnimatePresence } from 'framer-motion'

interface CollaborationIndicatorProps {
  entityType: 'client' | 'appointment' | 'note'
  entityId: string
}

interface ActiveUser {
  user_id: string
  user_email: string
  entity_type: string
  entity_id: string
  action: 'viewing' | 'editing'
  timestamp: string
}

export default function CollaborationIndicator({ entityType, entityId }: CollaborationIndicatorProps) {
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([])
  const [currentUser, setCurrentUser] = useState<string>('')
  const supabase = createClient()

  useEffect(() => {
    const setupRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      setCurrentUser(user.id)

      const channel = supabase
        .channel(`collaboration:${entityType}:${entityId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'collaboration_presence',
            filter: `entity_type=eq.${entityType}`,
          },
          (payload) => {
            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
              const newData = payload.new as ActiveUser
              if (newData.entity_id === entityId && newData.user_id !== user.id) {
                setActiveUsers((prev) => {
                  const exists = prev.find((u) => u.user_id === newData.user_id)
                  if (exists) {
                    return prev.map((u) => (u.user_id === newData.user_id ? newData : u))
                  }
                  return [...prev, newData]
                })
              }
            } else if (payload.eventType === 'DELETE') {
              const oldData = payload.old as ActiveUser
              setActiveUsers((prev) => prev.filter((u) => u.user_id !== oldData.user_id))
            }
          }
        )
        .subscribe()

      // Announce presence
      await supabase.from('collaboration_presence').upsert({
        user_id: user.id,
        user_email: user.email,
        entity_type: entityType,
        entity_id: entityId,
        action: 'viewing',
        timestamp: new Date().toISOString(),
      })

      // Clean up on unmount
      return () => {
        supabase.removeChannel(channel)
        supabase
          .from('collaboration_presence')
          .delete()
          .eq('user_id', user.id)
          .eq('entity_type', entityType)
          .eq('entity_id', entityId)
      }
    }

    setupRealtime()
  }, [entityType, entityId, supabase])

  // Remove inactive users after 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date()
      setActiveUsers((prev) =>
        prev.filter((u) => {
          const lastSeen = new Date(u.timestamp)
          const diff = now.getTime() - lastSeen.getTime()
          return diff < 30000
        })
      )
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  if (activeUsers.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed top-4 right-4 z-50 bg-white rounded-lg shadow-lg border border-gray-200 p-3 max-w-xs"
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        <span className="text-sm font-medium text-gray-900">
          {activeUsers.length} {activeUsers.length === 1 ? 'person' : 'people'} viewing
        </span>
      </div>
      <AnimatePresence>
        {activeUsers.map((user) => (
          <motion.div
            key={user.user_id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="flex items-center gap-2 py-1"
          >
            <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center">
              <span className="text-xs font-medium text-indigo-600">
                {user.user_email.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-900 truncate">{user.user_email}</p>
              <p className="text-xs text-gray-500 capitalize">{user.action}</p>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  )
}

export function CollaborationStatus({ entityType, entityId }: CollaborationIndicatorProps) {
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([])
  const [currentUser, setCurrentUser] = useState<string>('')
  const supabase = createClient()

  useEffect(() => {
    const setupRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      setCurrentUser(user.id)

      const channel = supabase
        .channel(`collaboration:${entityType}:${entityId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'collaboration_presence',
            filter: `entity_type=eq.${entityType}`,
          },
          (payload) => {
            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
              const newData = payload.new as ActiveUser
              if (newData.entity_id === entityId && newData.user_id !== user.id) {
                setActiveUsers((prev) => {
                  const exists = prev.find((u) => u.user_id === newData.user_id)
                  if (exists) {
                    return prev.map((u) => (u.user_id === newData.user_id ? newData : u))
                  }
                  return [...prev, newData]
                })
              }
            } else if (payload.eventType === 'DELETE') {
              const oldData = payload.old as ActiveUser
              setActiveUsers((prev) => prev.filter((u) => u.user_id !== oldData.user_id))
            }
          }
        )
        .subscribe()

      await supabase.from('collaboration_presence').upsert({
        user_id: user.id,
        user_email: user.email,
        entity_type: entityType,
        entity_id: entityId,
        action: 'editing',
        timestamp: new Date().toISOString(),
      })

      return () => {
        supabase.removeChannel(channel)
        supabase
          .from('collaboration_presence')
          .delete()
          .eq('user_id', user.id)
          .eq('entity_type', entityType)
          .eq('entity_id', entityId)
      }
    }

    setupRealtime()
  }, [entityType, entityId, supabase])

  if (activeUsers.length === 0) return null

  return (
    <div className="flex items-center gap-2 px-3 py-1 bg-yellow-50 border border-yellow-200 rounded-full">
      <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
      <span className="text-xs text-yellow-800">
        {activeUsers.length} other{activeUsers.length > 1 ? 's' : ''} editing
      </span>
    </div>
  )
}
