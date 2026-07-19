import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parseCSV } from '@/lib/csv-parser'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!file.name.endsWith('.csv')) {
      return NextResponse.json({ error: 'File must be a CSV' }, { status: 400 })
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 })
    }

    const text = await file.text()
    const parsed = parseCSV(text)

    const { data: upload, error } = await supabase
      .from('uploads')
      .insert({
        user_id: user.id,
        filename: file.name,
        bank_detected: parsed.bankDetected,
        transaction_count: parsed.transactionCount,
        date_range_start: parsed.dateRangeStart,
        date_range_end: parsed.dateRangeEnd,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      uploadId: upload.id,
      ...parsed,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to parse CSV'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}