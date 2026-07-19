'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import {
  ArrowLeft, TrendingDown, AlertTriangle,
  RefreshCw, MessageCircle, Zap
} from 'lucide-react'
import { AnalysisResult } from '@/lib/types'
import { ChatPanel } from '@/components/chat-panel'

const COLORS = [
  '#0f172a', '#1e293b', '#334155', '#475569',
  '#64748b', '#94a3b8', '#cbd5e1', '#e2e8f0'
]

export function AnalysisDashboard({ analysis }: { analysis: any }) {
  const [showChat, setShowChat] = useState(false)
  const result: AnalysisResult = analysis.result
  const upload = analysis.uploads

  const categoryData = Object.entries(result.categories || {})
    .map(([name, value]) => ({ name, value: Math.round(value as number) }))
    .slice(0, 8)

  const monthlyData = (result.monthlyTrends || []).map(m => ({
    month: m.month.slice(5),
    spent: Math.round(m.spent),
    income: Math.round(m.income),
  }))

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="border-b bg-white px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="gap-1.5">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          </Link>
          <div className="h-4 w-px bg-slate-200" />
          <div>
            <p className="text-sm font-medium text-slate-800">{upload?.filename}</p>
            <p className="text-xs text-slate-400">
              {upload?.transaction_count} transactions · {upload?.bank_detected} ·{' '}
              {upload?.date_range_start} to {upload?.date_range_end}
            </p>
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="gap-2"
          onClick={() => setShowChat(!showChat)}
        >
          <MessageCircle className="w-4 h-4" />
          Ask a question
        </Button>
      </nav>

      <div className={`flex ${showChat ? 'gap-0' : ''}`}>
        <main className={`flex-1 max-w-5xl mx-auto px-6 py-8 space-y-6 transition-all ${showChat ? 'max-w-3xl' : ''}`}>

          {/* Top metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total spent', value: formatCurrency(result.totalSpent), sub: 'across all categories' },
              { label: 'Total income', value: formatCurrency(result.totalIncome), sub: 'credited to account' },
              { label: 'Savings rate', value: `${result.savingsRate}%`, sub: result.savingsRate > 20 ? 'healthy' : result.savingsRate > 0 ? 'room to improve' : 'spending > income' },
              { label: 'Subscription waste', value: formatCurrency(result.subscriptionWaste), sub: 'unused recurring charges' },
            ].map(({ label, value, sub }) => (
              <div key={label} className="bg-white border rounded-xl p-4 space-y-1">
                <p className="text-xs text-slate-400">{label}</p>
                <p className="text-xl font-semibold text-slate-900">{value}</p>
                <p className="text-xs text-slate-400">{sub}</p>
              </div>
            ))}
          </div>

          {/* AI insights */}
          {result.insights?.length > 0 && (
            <div className="bg-slate-900 text-white rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Zap className="w-4 h-4" />
                What the AI found
              </div>
              <ul className="space-y-2">
                {result.insights.map((insight, i) => (
                  <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                    <span className="text-slate-500 mt-0.5">—</span>
                    {insight}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Tabs defaultValue="spending">
            <TabsList>
              <TabsTrigger value="spending">Spending</TabsTrigger>
              <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
              <TabsTrigger value="anomalies">Anomalies</TabsTrigger>
              <TabsTrigger value="trends">Monthly trends</TabsTrigger>
            </TabsList>

            {/* Spending breakdown */}
            <TabsContent value="spending" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Spending by category</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={categoryData} layout="vertical" margin={{ left: 16, right: 16 }}>
                      <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={v => `$${v}`} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={110} />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      <Bar dataKey="value" radius={4}>
                        {categoryData.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="mt-4 space-y-2">
                    {categoryData.map(({ name, value }, i) => (
                      <div key={name} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-sm" style={{ background: COLORS[i % COLORS.length] }} />
                          <span className="text-slate-600">{name}</span>
                        </div>
                        <span className="font-medium text-slate-800">{formatCurrency(value)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Subscriptions */}
            <TabsContent value="subscriptions" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Recurring charges</CardTitle>
                </CardHeader>
                <CardContent>
                  {result.subscriptions?.length === 0 ? (
                    <p className="text-sm text-slate-400">No recurring charges detected</p>
                  ) : (
                    <div className="space-y-2">
                      {result.subscriptions?.map((sub, i) => (
                        <div key={i} className="flex items-center justify-between py-3 border-b last:border-0">
                          <div className="space-y-0.5">
                            <p className="text-sm font-medium text-slate-800">{sub.merchant}</p>
                            <div className="flex items-center gap-2">
                              <Badge variant={sub.status === 'unused' ? 'destructive' : 'secondary'} className="text-xs">
                                {sub.status === 'unused' ? 'unused' : 'active'}
                              </Badge>
                              <span className="text-xs text-slate-400">{sub.frequency}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-slate-900">{formatCurrency(sub.amount)}/mo</p>
                            <p className="text-xs text-slate-400">last: {sub.lastCharged}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Anomalies */}
            <TabsContent value="anomalies" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    Unusual transactions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {result.anomalies?.length === 0 ? (
                    <p className="text-sm text-slate-400">No anomalies detected — looks clean</p>
                  ) : (
                    <div className="space-y-3">
                      {result.anomalies?.map((anomaly, i) => (
                        <div key={i} className="bg-amber-50 border border-amber-100 rounded-lg p-4 space-y-1">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-slate-800">{anomaly.description}</p>
                            <p className="text-sm font-semibold text-slate-900">{formatCurrency(anomaly.amount)}</p>
                          </div>
                          <p className="text-xs text-amber-700">{anomaly.reason}</p>
                          <p className="text-xs text-slate-400">{anomaly.date}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Monthly trends */}
            <TabsContent value="trends" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingDown className="w-4 h-4" />
                    Month over month
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={monthlyData} margin={{ left: 8, right: 8 }}>
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `$${v}`} />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      <Bar dataKey="spent" name="Spent" fill="#0f172a" radius={4} />
                      <Bar dataKey="income" name="Income" fill="#cbd5e1" radius={4} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>

        {showChat && (
          <div className="w-96 border-l bg-white sticky top-[65px] h-[calc(100vh-65px)]">
            <ChatPanel analysisId={analysis.id} />
          </div>
        )}
      </div>
    </div>
  )
}