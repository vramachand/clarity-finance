import Anthropic from '@anthropic-ai/sdk'
import { Transaction, AnalysisResult, Subscription, Anomaly, MonthlyTrend } from './types'

const client = new Anthropic()

// ── Tool implementations (pure functions over transaction data) ──

function categorizeSpending(transactions: Transaction[]): Record<string, number> {
  const categoryMap: Record<string, string[]> = {
    'Food & Dining': ['restaurant', 'doordash', 'uber eats', 'grubhub', 'mcdonald', 'starbucks', 'chipotle', 'pizza', 'cafe', 'coffee', 'diner', 'sushi', 'taco'],
    'Groceries': ['whole foods', 'trader joe', 'safeway', 'kroger', 'walmart', 'target', 'costco', 'grocery', 'market', 'food'],
    'Transport': ['uber', 'lyft', 'gas', 'parking', 'transit', 'metro', 'taxi', 'toll', 'shell', 'chevron', 'bp'],
    'Entertainment': ['netflix', 'spotify', 'hulu', 'disney', 'amazon prime', 'apple tv', 'youtube', 'movie', 'theater', 'concert', 'game'],
    'Shopping': ['amazon', 'ebay', 'etsy', 'zara', 'h&m', 'nike', 'apple store', 'best buy', 'clothing', 'shop'],
    'Health': ['pharmacy', 'cvs', 'walgreens', 'doctor', 'dental', 'gym', 'fitness', 'medical', 'health'],
    'Utilities': ['electric', 'water', 'internet', 'phone', 'at&t', 'verizon', 'comcast', 'utility'],
    'Rent & Housing': ['rent', 'mortgage', 'airbnb', 'hotel'],
    'Travel': ['airline', 'flight', 'hotel', 'booking', 'expedia', 'airbnb', 'travel'],
    'Subscriptions': ['subscription', 'monthly', 'annual', 'membership'],
  }

  const totals: Record<string, number> = {}
  const debits = transactions.filter(t => t.type === 'debit')

  for (const t of debits) {
    const desc = t.description.toLowerCase()
    let matched = false

    for (const [category, keywords] of Object.entries(categoryMap)) {
      if (keywords.some(k => desc.includes(k))) {
        totals[category] = (totals[category] || 0) + t.amount
        matched = true
        break
      }
    }

    if (!matched) {
      totals['Other'] = (totals['Other'] || 0) + t.amount
    }
  }

  return Object.fromEntries(
    Object.entries(totals)
      .sort(([, a], [, b]) => b - a)
      .map(([k, v]) => [k, Math.round(v * 100) / 100])
  )
}

function findSubscriptions(transactions: Transaction[]): Subscription[] {
  const merchantGroups: Record<string, Transaction[]> = {}

  for (const t of transactions) {
    const key = t.merchant || t.description
    if (!merchantGroups[key]) merchantGroups[key] = []
    merchantGroups[key].push(t)
  }

  const subscriptions: Subscription[] = []

  for (const [merchant, txns] of Object.entries(merchantGroups)) {
    if (txns.length < 2) continue

    const amounts = txns.map(t => t.amount)
    const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length
    const variance = amounts.reduce((a, b) => a + Math.pow(b - avgAmount, 2), 0) / amounts.length

    // Low variance in amount = likely subscription
    if (variance < 1 && avgAmount > 0) {
      const sorted = txns.sort((a, b) => b.date.localeCompare(a.date))
      const daysSinceLastCharge = Math.floor(
        (Date.now() - new Date(sorted[0].date).getTime()) / (1000 * 60 * 60 * 24)
      )

      subscriptions.push({
        merchant,
        amount: Math.round(avgAmount * 100) / 100,
        frequency: txns.length >= 4 ? 'monthly' : 'occasional',
        lastCharged: sorted[0].date,
        status: daysSinceLastCharge > 45 ? 'unused' : 'active',
      })
    }
  }

  return subscriptions.sort((a, b) => b.amount - a.amount).slice(0, 15)
}

function detectAnomalies(transactions: Transaction[]): Anomaly[] {
  const anomalies: Anomaly[] = []
  const debits = transactions.filter(t => t.type === 'debit')

  if (debits.length === 0) return []

  const amounts = debits.map(t => t.amount)
  const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length
  const stdDev = Math.sqrt(
    amounts.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / amounts.length
  )

  for (const t of debits) {
    // Unusually large charge (> 3 standard deviations above mean)
    if (t.amount > avg + 3 * stdDev && t.amount > 100) {
      anomalies.push({
        date: t.date,
        description: t.description,
        amount: t.amount,
        reason: `Unusually large charge — ${Math.round(t.amount / avg)}x your average transaction`,
      })
    }
  }

  // Detect potential duplicates
  for (let i = 0; i < debits.length; i++) {
    for (let j = i + 1; j < debits.length; j++) {
      const a = debits[i], b = debits[j]
      const daysDiff = Math.abs(
        (new Date(a.date).getTime() - new Date(b.date).getTime()) / (1000 * 60 * 60 * 24)
      )
      if (
        daysDiff <= 3 &&
        Math.abs(a.amount - b.amount) < 0.01 &&
        a.merchant === b.merchant
      ) {
        anomalies.push({
          date: b.date,
          description: b.description,
          amount: b.amount,
          reason: `Possible duplicate charge from ${a.date}`,
        })
      }
    }
  }

  return anomalies.slice(0, 10)
}

function compareMonths(transactions: Transaction[]): MonthlyTrend[] {
  const byMonth: Record<string, Transaction[]> = {}

  for (const t of transactions) {
    const month = t.date.slice(0, 7) // YYYY-MM
    if (!byMonth[month]) byMonth[month] = []
    byMonth[month].push(t)
  }

  return Object.entries(byMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, txns]) => {
      const spent = txns.filter(t => t.type === 'debit').reduce((s, t) => s + t.amount, 0)
      const income = txns.filter(t => t.type === 'credit').reduce((s, t) => s + t.amount, 0)
      const categories = categorizeSpending(txns)
      const topCategory = Object.entries(categories)[0]?.[0] || 'Other'

      return {
        month,
        spent: Math.round(spent * 100) / 100,
        income: Math.round(income * 100) / 100,
        topCategory,
      }
    })
}

function calculateSavingsRate(transactions: Transaction[]): { rate: number; totalIncome: number; totalSpent: number } {
  const totalIncome = transactions
    .filter(t => t.type === 'credit')
    .reduce((s, t) => s + t.amount, 0)

  const totalSpent = transactions
    .filter(t => t.type === 'debit')
    .reduce((s, t) => s + t.amount, 0)

  const rate = totalIncome > 0
    ? Math.round(((totalIncome - totalSpent) / totalIncome) * 100 * 10) / 10
    : 0

  return {
    rate,
    totalIncome: Math.round(totalIncome * 100) / 100,
    totalSpent: Math.round(totalSpent * 100) / 100,
  }
}

// ── Tool definitions for Claude ──

const tools: Anthropic.Tool[] = [
  {
    name: 'categorize_spending',
    description: 'Break all transactions into spending categories and return totals per category',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'find_subscriptions',
    description: 'Identify recurring charges — same merchant, similar amount, regular cadence',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'detect_anomalies',
    description: 'Find transactions that are unusually large or potential duplicates',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'compare_months',
    description: 'Compare spending month over month and return trends',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'calculate_savings_rate',
    description: 'Compute total income vs total outflows and return savings rate',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
]

// ── Main agent loop ──

export async function runAnalysisAgent(transactions: Transaction[]): Promise<AnalysisResult> {
  const messages: Anthropic.MessageParam[] = [
    {
      role: 'user',
      content: `You are a personal finance analyst. Analyze these ${transactions.length} transactions.
      
Call ALL five tools to get a complete picture, then write a direct, honest summary.
Be specific — use exact dollar amounts. Don't sugarcoat waste.

Transaction data:
${JSON.stringify(transactions.slice(0, 500))}`, // limit for context window
    },
  ]

  let categories: Record<string, number> = {}
  let subscriptions: Subscription[] = []
  let anomalies: Anomaly[] = []
  let monthlyTrends: MonthlyTrend[] = []
  let savingsData = { rate: 0, totalIncome: 0, totalSpent: 0 }
  let summary = ''
  let insights: string[] = []

  // Agentic loop
  while (true) {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      tools,
      messages,
    })

    messages.push({ role: 'assistant', content: response.content })

    if (response.stop_reason === 'end_turn') {
      // Extract final text summary
      const textBlock = response.content.find(b => b.type === 'text')
      if (textBlock && textBlock.type === 'text') {
        summary = textBlock.text

        // Extract bullet insights from summary
        insights = summary
          .split('\n')
          .filter(line => line.trim().startsWith('-') || line.trim().startsWith('•'))
          .map(line => line.replace(/^[-•]\s*/, '').trim())
          .filter(Boolean)
          .slice(0, 6)
      }
      break
    }

    if (response.stop_reason === 'tool_use') {
      const toolResults: Anthropic.MessageParam = {
        role: 'user',
        content: response.content
          .filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use')
          .map(toolUse => {
            let result: unknown

            switch (toolUse.name) {
              case 'categorize_spending':
                categories = categorizeSpending(transactions)
                result = categories
                break
              case 'find_subscriptions':
                subscriptions = findSubscriptions(transactions)
                result = subscriptions
                break
              case 'detect_anomalies':
                anomalies = detectAnomalies(transactions)
                result = anomalies
                break
              case 'compare_months':
                monthlyTrends = compareMonths(transactions)
                result = monthlyTrends
                break
              case 'calculate_savings_rate':
                savingsData = calculateSavingsRate(transactions)
                result = savingsData
                break
              default:
                result = { error: 'Unknown tool' }
            }

            return {
              type: 'tool_result' as const,
              tool_use_id: toolUse.id,
              content: JSON.stringify(result),
            }
          }),
      }

      messages.push(toolResults)
    }
  }

  const subscriptionWaste = subscriptions
    .filter(s => s.status === 'unused')
    .reduce((sum, s) => sum + s.amount, 0)

  return {
    totalSpent: savingsData.totalSpent,
    totalIncome: savingsData.totalIncome,
    savingsRate: savingsData.rate,
    topCategory: Object.keys(categories)[0] || 'Unknown',
    subscriptionWaste: Math.round(subscriptionWaste * 100) / 100,
    categories,
    subscriptions,
    anomalies,
    monthlyTrends,
    insights,
    summary,
  }
}