import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { UploadZone } from '@/components/upload-zone'
import { LogOut, History } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: analyses } = await supabase
    .from('analyses')
    .select(`
      id, created_at, total_spent, savings_rate, subscription_waste,
      uploads (filename, transaction_count, date_range_start, date_range_end)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5)

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="border-b bg-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-slate-900 rounded-md flex items-center justify-center">
            <span className="text-white font-semibold text-xs">C</span>
          </div>
          <span className="font-semibold text-slate-900">Clarity</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">{user.email}</span>
          <form action="/auth/signout" method="POST">
            <Button variant="ghost" size="sm" type="submit">
              <LogOut className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-12 space-y-10">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-slate-900">Upload a statement</h1>
          <p className="text-slate-500">
            Export a CSV from your bank and drop it below. Analysis takes about 30 seconds.
          </p>
        </div>

        <UploadZone />

        {analyses && analyses.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <History className="w-4 h-4" />
              Past analyses
            </div>
            <div className="space-y-2">
              {analyses.map((a: any) => (
                <Link key={a.id} href={`/dashboard/${a.id}`}>
                  <div className="bg-white border rounded-xl px-5 py-4 flex items-center justify-between hover:border-slate-300 transition-colors">
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium text-slate-800">
                        {(a.uploads as any)?.filename}
                      </p>
                      <p className="text-xs text-slate-400">
                        {(a.uploads as any)?.transaction_count} transactions ·{' '}
                        {new Date(a.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right space-y-0.5">
                      <p className="text-sm font-medium text-slate-800">
                        ${a.total_spent?.toLocaleString()}
                      </p>
                      <p className="text-xs text-slate-400">
                        {a.savings_rate}% savings rate
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}