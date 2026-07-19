import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: analyses, error } = await supabase
      .from('analyses')
      .select(`
        id,
        created_at,
        total_spent,
        total_income,
        savings_rate,
        top_category,
        subscription_waste,
        uploads (
          filename,
          bank_detected,
          transaction_count,
          date_range_start,
          date_range_end
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) throw error

    return NextResponse.json({ analyses })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch history'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}