import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'

export default async function ClientProgressPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!client) {
    notFound()
  }

  const { data: questionnaires } = await supabase
    .from('questionnaires')
    .select('*')
    .eq('client_id', params.id)
    .order('completed_at', { ascending: true })

  const { data: appointments } = await supabase
    .from('appointments')
    .select('*, session_notes(*)')
    .eq('client_id', params.id)
    .eq('status', 'completed')
    .order('starts_at', { ascending: true })

  // Extract PHQ-9 and GAD-7 scores
  const phq9Scores = questionnaires
    ?.filter((q) => q.type === 'phq9')
    .map((q) => ({
      date: new Date(q.completed_at).toLocaleDateString(),
      score: q.total_score,
      severity: q.severity,
    })) || []

  const gad7Scores = questionnaires
    ?.filter((q) => q.type === 'gad7')
    .map((q) => ({
      date: new Date(q.completed_at).toLocaleDateString(),
      score: q.total_score,
      severity: q.severity,
    })) || []

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Link href={`/clients/${params.id}`} className="text-indigo-600 hover:text-indigo-500">
            ← Back to Client
          </Link>
          <h1 className="mt-4 text-3xl font-bold text-gray-900">Progress: {client.full_name}</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* PHQ-9 Progress */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">PHQ-9 (Depression) Progress</h3>
            {phq9Scores.length > 0 ? (
              <div className="space-y-4">
                {phq9Scores.map((entry, index) => (
                  <div key={index} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{entry.date}</p>
                      <p className="text-sm text-gray-500">Score: {entry.score}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      entry.severity === 'Minimal' ? 'bg-green-100 text-green-800' :
                      entry.severity === 'Mild' ? 'bg-yellow-100 text-yellow-800' :
                      entry.severity === 'Moderate' ? 'bg-orange-100 text-orange-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {entry.severity}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No PHQ-9 questionnaires completed yet</p>
            )}
          </div>

          {/* GAD-7 Progress */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">GAD-7 (Anxiety) Progress</h3>
            {gad7Scores.length > 0 ? (
              <div className="space-y-4">
                {gad7Scores.map((entry, index) => (
                  <div key={index} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{entry.date}</p>
                      <p className="text-sm text-gray-500">Score: {entry.score}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      entry.severity === 'Minimal' ? 'bg-green-100 text-green-800' :
                      entry.severity === 'Mild' ? 'bg-yellow-100 text-yellow-800' :
                      entry.severity === 'Moderate' ? 'bg-orange-100 text-orange-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {entry.severity}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No GAD-7 questionnaires completed yet</p>
            )}
          </div>
        </div>

        {/* Session History */}
        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Session History</h3>
          {appointments && appointments.length > 0 ? (
            <div className="space-y-3">
              {appointments.map((apt: any) => (
                <div key={apt.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {new Date(apt.starts_at).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-gray-500">{apt.session_type} - {apt.location_type}</p>
                  </div>
                  <div>
                    {apt.session_notes ? (
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        Note Completed
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                        No Note
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No completed sessions yet</p>
          )}
        </div>

        {/* Summary */}
        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Progress Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 p-4 rounded-md">
              <p className="text-sm text-gray-500">Total Sessions</p>
              <p className="text-2xl font-bold text-gray-900">{appointments?.length || 0}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-md">
              <p className="text-sm text-gray-500">PHQ-9 Assessments</p>
              <p className="text-2xl font-bold text-gray-900">{phq9Scores.length}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-md">
              <p className="text-sm text-gray-500">GAD-7 Assessments</p>
              <p className="text-2xl font-bold text-gray-900">{gad7Scores.length}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
