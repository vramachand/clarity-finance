# clarity-finance
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight, BarChart3, Shield, Zap } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <nav className="border-b bg-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-slate-900 rounded-md flex items-center justify-center">
            <span className="text-white font-semibold text-xs">C</span>
          </div>
          <span className="font-semibold text-slate-900">Clarity</span>
        </div>
        <Link href="/auth/login">
          <Button variant="outline" size="sm">Sign in</Button>
        </Link>
      </nav>

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-24 text-center">
        <div className="max-w-2xl space-y-6">
          <div className="inline-flex items-center gap-2 bg-slate-100 text-slate-600 text-sm px-3 py-1 rounded-full">
            <Zap className="w-3 h-3" />
            AI-powered in seconds
          </div>
          <h1 className="text-5xl font-semibold tracking-tight text-slate-900 leading-tight">
            Know exactly where your money goes
          </h1>
          <p className="text-xl text-slate-500 leading-relaxed">
            Upload your bank CSV and get an honest, specific breakdown of your spending —
            subscriptions you forgot, patterns you missed, and what to do about it.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link href="/auth/login">
              <Button size="lg" className="gap-2 w-full sm:w-auto">
                Get started free
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
          <p className="text-sm text-slate-400">
            No bank login required. Just export your CSV and upload.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-24 max-w-3xl w-full text-left">
          {[
            {
              icon: BarChart3,
              title: 'Full spending breakdown',
              desc: 'Every category, every month, ranked by what hurts most.',
            },
            {
              icon: Zap,
              title: 'Subscription waste finder',
              desc: 'Finds recurring charges you forgot about and flags unused ones.',
            },
            {
              icon: Shield,
              title: 'Anomaly detection',
              desc: 'Spots duplicate charges and unusually large transactions.',
            },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-white border rounded-xl p-5 space-y-2">
              <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                <Icon className="w-4 h-4 text-slate-700" />
              </div>
              <h3 className="font-medium text-slate-900">{title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="border-t bg-white px-6 py-4 text-center text-sm text-slate-400">
        Clarity — your data never leaves your account
      </footer>
    </div>
  )
}
