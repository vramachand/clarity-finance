import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { AnalysisDashboard } from '@/components/analysis-dashboard'

export default async function AnalysisPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: analysis } = await supabase
    .from('analyses')
    .select(`
      *,
      uploads (filename, bank_detected, transaction_count, date_range_start, date_range_end)
    `)
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!analysis) notFound()

  return <AnalysisDashboard analysis={analysis} />
}