'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useToast } from '@/components/ui/toast/ToastProvider'
import { handleError, getErrorMessage } from '@/lib/utils/errors'
import { motion } from 'framer-motion'

export default function DocumentsPage() {
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [documents, setDocuments] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [selectedClient, setSelectedClient] = useState('')
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
      loadDocuments()
      loadClients()
    }
  }, [supabase])

  const loadDocuments = async () => {
    if (!supabase) return
    const { data } = await supabase
      .from('documents')
      .select('*, clients(full_name)')
      .order('created_at', { ascending: false })
    if (data) setDocuments(data)
  }

  const loadClients = async () => {
    if (!supabase) return
    const { data } = await supabase
      .from('clients')
      .select('id, full_name')
      .eq('status', 'active')
    if (data) setClients(data)
  }

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const file = formData.get('file') as File
    const clientId = formData.get('clientId') as string
    const documentType = formData.get('documentType') as string
    const description = formData.get('description') as string

    if (!file || !clientId) {
      setError('Please select a file and client')
      return
    }

    if (!supabase) {
      setError('Unable to connect to database')
      return
    }

    setUploading(true)
    try {
      // Upload file to Supabase Storage
      const fileExt = file.name.split('.').pop()
      const fileName = `${clientId}/${Date.now()}.${fileExt}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(fileName)

      // Save document record
      const { error: insertError } = await supabase
        .from('documents')
        .insert({
          client_id: clientId,
          file_name: file.name,
          file_path: fileName,
          file_url: publicUrl,
          file_type: file.type,
          document_type: documentType,
          description: description || null,
        })

      if (insertError) throw insertError

      showToast('success', 'Document uploaded successfully')
      loadDocuments()
      e.currentTarget.reset()
    } catch (err) {
      const appError = handleError(err)
      setError(getErrorMessage(appError))
      showToast('error', getErrorMessage(appError))
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (documentId: string, filePath: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return

    if (!supabase) {
      setError('Unable to connect to database')
      return
    }

    setLoading(true)
    try {
      // Delete from storage
      await supabase.storage.from('documents').remove([filePath])

      // Delete record
      const { error: deleteError } = await supabase
        .from('documents')
        .delete()
        .eq('id', documentId)

      if (deleteError) throw deleteError

      showToast('success', 'Document deleted successfully')
      loadDocuments()
    } catch (err) {
      const appError = handleError(err)
      setError(getErrorMessage(appError))
      showToast('error', getErrorMessage(appError))
    } finally {
      setLoading(false)
    }
  }

  const getDocumentIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return '📄'
    if (fileType.includes('image')) return '🖼️'
    if (fileType.includes('word') || fileType.includes('doc')) return '📝'
    if (fileType.includes('excel') || fileType.includes('sheet')) return '📊'
    return '📎'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Documents</h1>
          <p className="mt-2 text-gray-600">Manage client documents and files</p>
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

        {/* Upload Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow p-6 mb-8"
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload Document</h2>
          <form onSubmit={handleUpload} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="clientId" className="block text-sm font-medium text-gray-700 mb-1">
                  Client *
                </label>
                <select
                  id="clientId"
                  name="clientId"
                  required
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
              <div>
                <label htmlFor="documentType" className="block text-sm font-medium text-gray-700 mb-1">
                  Document Type
                </label>
                <select
                  id="documentType"
                  name="documentType"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="general">General</option>
                  <option value="intake">Intake Form</option>
                  <option value="consent">Consent Form</option>
                  <option value="assessment">Assessment</option>
                  <option value="treatment_plan">Treatment Plan</option>
                  <option value="progress">Progress Report</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            <div>
              <label htmlFor="file" className="block text-sm font-medium text-gray-700 mb-1">
                File *
              </label>
              <input
                id="file"
                name="file"
                type="file"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <button
              type="submit"
              disabled={uploading}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              {uploading ? 'Uploading...' : 'Upload Document'}
            </button>
          </form>
        </motion.div>

        {/* Documents List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-lg shadow overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">All Documents</h2>
          </div>
          {documents.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              No documents uploaded yet
            </div>
          ) : (
            <div className="divide-y">
              {documents.map((doc, index) => (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="px-6 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="text-3xl">{getDocumentIcon(doc.file_type)}</div>
                      <div>
                        <h3 className="font-medium text-gray-900">{doc.file_name}</h3>
                        <p className="text-sm text-gray-500">
                          {doc.clients?.full_name} • {doc.document_type}
                        </p>
                        {doc.description && (
                          <p className="text-sm text-gray-400 mt-1">{doc.description}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                          Uploaded {new Date(doc.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <a
                        href={doc.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1 text-sm bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200"
                      >
                        View
                      </a>
                      <button
                        onClick={() => handleDelete(doc.id, doc.file_path)}
                        disabled={loading}
                        className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
