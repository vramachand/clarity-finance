export interface Transaction {
  date: string
  description: string
  amount: number
  type: 'debit' | 'credit'
  category?: string
  merchant?: string
}

export interface ParsedCSV {
  transactions: Transaction[]
  bankDetected: string
  transactionCount: number
  dateRangeStart: string
  dateRangeEnd: string
}

export interface AnalysisResult {
  totalSpent: number
  totalIncome: number
  savingsRate: number
  topCategory: string
  subscriptionWaste: number
  categories: Record<string, number>
  subscriptions: Subscription[]
  anomalies: Anomaly[]
  monthlyTrends: MonthlyTrend[]
  insights: string[]
  summary: string
}

export interface Subscription {
  merchant: string
  amount: number
  frequency: string
  lastCharged: string
  status: 'active' | 'unused'
}

export interface Anomaly {
  date: string
  description: string
  amount: number
  reason: string
}

export interface MonthlyTrend {
  month: string
  spent: number
  income: number
  topCategory: string
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}