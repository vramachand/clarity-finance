import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { runAnalysisAgent } from '@/lib/agent'
import { Transaction } from '@/lib/types'

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, '1 d'),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limit: 5 analyses per user per day
    const { success, remaining } = await ratelimit.limit(user.id)
    if (!success) {
      return NextResponse.json(
        { error: 'Daily analysis limit reached (5/day). Try again tomorrow.' },
        { status: 429 }
      )
    }

    const { uploadId, transactions } = await request.json() as {
      uploadId: string
      transactions: Transaction[]
    }

    if (!uploadId || !transactions?.length) {
      return NextResponse.json({ error: 'Missing uploadId or transactions' }, { status: 400 })
    }

    // Verify upload belongs to user
    const { data: upload } = await supabase
      .from('uploads')
      .select('id')
      .eq('id', uploadId)
      .eq('user_id', user.id)
      .single()

    if (!upload) {
      return NextResponse.json({ error: 'Upload not found' }, { status: 404 })
    }

    // Run agent
    const result = await runAnalysisAgent(transactions)

    // Store analysis
    const { data: analysis, error } = await supabase
      .from('analyses')
      .insert({
        upload_id: uploadId,
        user_id: user.id,
        total_spent: result.totalSpent,
        total_income: result.totalIncome,
        savings_rate: result.savingsRate,
        top_category: result.topCategory,
        subscription_waste: result.subscriptionWaste,
        result,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      analysisId: analysis.id,
      result,
      remainingToday: remaining,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Analysis failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}