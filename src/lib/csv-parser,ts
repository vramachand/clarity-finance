import Papa from 'papaparse'
import { z } from 'zod'
import { Transaction, ParsedCSV } from './types'

// Zod schemas for each bank format
const ChaseSchema = z.object({
  'Transaction Date': z.string(),
  'Description': z.string(),
  'Amount': z.string(),
  'Type': z.string().optional(),
})

const BofASchema = z.object({
  'Date': z.string(),
  'Description': z.string(),
  'Amount': z.string(),
  'Running Bal.': z.string().optional(),
})

const WellsSchema = z.object({
  'Date': z.string(),
  'Amount': z.string(),
  'Description': z.string(),
})

const GenericSchema = z.object({
  'Date': z.string(),
  'Description': z.string(),
  'Amount': z.string(),
}).passthrough()

type BankFormat = 'chase' | 'bofa' | 'wells' | 'generic'

function detectBank(headers: string[]): BankFormat {
  const h = headers.map(h => h.toLowerCase().trim())
  if (h.includes('transaction date')) return 'chase'
  if (h.includes('running bal.')) return 'bofa'
  if (h.includes('date') && h.length <= 4 && !h.includes('type')) return 'wells'
  return 'generic'
}

function parseAmount(raw: string): number {
  const cleaned = raw.replace(/[$,\s]/g, '').trim()
  return parseFloat(cleaned) || 0
}

function normalizeDate(raw: string): string {
  const d = new Date(raw)
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]
  return raw
}

function normalizeTransaction(
  row: Record<string, string>,
  bank: BankFormat
): Transaction | null {
  try {
    let date = '', description = '', amount = 0

    if (bank === 'chase') {
      date = normalizeDate(row['Transaction Date'])
      description = row['Description']
      amount = parseAmount(row['Amount'])
    } else if (bank === 'bofa') {
      date = normalizeDate(row['Date'])
      description = row['Description']
      amount = parseAmount(row['Amount'])
    } else {
      date = normalizeDate(row['Date'] || row['date'])
      description = row['Description'] || row['description'] || row['Memo'] || ''
      amount = parseAmount(row['Amount'] || row['amount'])
    }

    if (!date || !description || isNaN(amount)) return null

    return {
      date,
      description: description.trim(),
      amount: Math.abs(amount),
      type: amount < 0 ? 'debit' : 'credit',
      merchant: extractMerchant(description),
    }
  } catch {
    return null
  }
}

function extractMerchant(description: string): string {
  // Strip common bank noise from merchant names
  return description
    .replace(/\s+\d{4,}/g, '')
    .replace(/(POS|ACH|DEBIT|CREDIT|PURCHASE|PAYMENT)\s*/gi, '')
    .trim()
    .slice(0, 50)
}

export function parseCSV(csvText: string): ParsedCSV {
  const result = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  })

  if (result.errors.length > 0 && result.data.length === 0) {
    throw new Error('Could not parse CSV file')
  }

  const headers = Object.keys(result.data[0] || {})
  const bank = detectBank(headers)

  const transactions: Transaction[] = result.data
    .map(row => normalizeTransaction(row, bank))
    .filter((t): t is Transaction => t !== null)

  if (transactions.length === 0) {
    throw new Error('No valid transactions found in CSV')
  }

  const dates = transactions.map(t => t.date).sort()

  return {
    transactions,
    bankDetected: bank,
    transactionCount: transactions.length,
    dateRangeStart: dates[0],
    dateRangeEnd: dates[dates.length - 1],
  }
}