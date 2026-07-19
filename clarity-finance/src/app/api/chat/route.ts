import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import { ChatMessage } from '@/lib/types'

const anthropic = new Anthropic()

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { message, analysisId, sessionId } = await request.json() as {
      message: string
      analysisId: string
      sessionId?: string
    }

    if (!message || !analysisId) {
      return NextResponse.json({ error: 'Missing message or analysisId' }, { status: 400 })
    }

    // Fetch analysis for context
    const { data: analysis } = await supabase
      .from('analyses')
      .select('result')
      .eq('id', analysisId)
      .eq('user_id', user.id)
      .single()

    if (!analysis) {
      return NextResponse.json({ error: 'Analysis not found' }, { status: 404 })
    }

    // Get or create chat session
    let session
    if (sessionId) {
      const { data } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('id', sessionId)
        .eq('user_id', user.id)
        .single()
      session = data
    }

    const history: ChatMessage[] = session?.messages || []

    // Build messages for Claude
    const claudeMessages: Anthropic.MessageParam[] = [
      ...history.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user' as const, content: message },
    ]

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: `You are a personal finance analyst with access to the user's complete transaction analysis.
      
Answer questions directly and specifically. Use exact dollar amounts from their data.
Be honest about wasteful spending. Don't hedge or give generic advice.

Their financial analysis:
${JSON.stringify(analysis.result, null, 2)}`,
      messages: claudeMessages,
    })

    const assistantMessage = response.content[0].type === 'text'
      ? response.content[0].text
      : ''

    // Update chat history
    const newHistory: ChatMessage[] = [
      ...history,
      { role: 'user', content: message, timestamp: new Date().toISOString() },
      { role: 'assistant', content: assistantMessage, timestamp: new Date().toISOString() },
    ]

    // Upsert session
    let newSessionId = sessionId
    if (!sessionId) {
      const { data: newSession } = await supabase
        .from('chat_sessions')
        .insert({
          analysis_id: analysisId,
          user_id: user.id,
          messages: newHistory,
        })
        .select()
        .single()
      newSessionId = newSession?.id
    } else {
      await supabase
        .from('chat_sessions')
        .update({ messages: newHistory, updated_at: new Date().toISOString() })
        .eq('id', sessionId)
    }

    return NextResponse.json({
      message: assistantMessage,
      sessionId: newSessionId,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Chat failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}