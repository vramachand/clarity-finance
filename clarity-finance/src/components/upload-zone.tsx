'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, FileText, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ParsedCSV } from '@/lib/types'

export function UploadZone() {
  const router = useRouter()
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [parsed, setParsed] = useState<(ParsedCSV & { uploadId: string }) | null>(null)

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      setError('Please upload a CSV file')
      return
    }

    setError(null)
    setIsUploading(true)

    try {
      // Step 1: Parse
      const formData = new FormData()
      formData.append('file', file)

      const parseRes = await fetch('/api/parse', {
        method: 'POST',
        body: formData,
      })

      const parseData = await parseRes.json()
      if (!parseRes.ok) throw new Error(parseData.error)

      setParsed(parseData)
      setIsUploading(false)
      setIsAnalyzing(true)

      // Step 2: Analyze
      const analyzeRes = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uploadId: parseData.uploadId,
          transactions: parseData.transactions,
        }),
      })

      const analyzeData = await analyzeRes.json()
      if (!analyzeRes.ok) throw new Error(analyzeData.error)

      router.push(`/dashboard/${analyzeData.analysisId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setIsUploading(false)
      setIsAnalyzing(false)
    }
  }, [router])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  const isLoading = isUploading || isAnalyzing

  return (
    <div className="w-full max-w-xl mx-auto space-y-4">
      <label
        className={`
          block border-2 border-dashed rounded-xl p-12 text-center cursor-pointer
          transition-colors duration-150
          ${isDragging ? 'border-slate-400 bg-slate-50' : 'border-slate-200 hover:border-slate-300 bg-white'}
          ${isLoading ? 'pointer-events-none opacity-60' : ''}
        `}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
      >
        <input
          type="file"
          accept=".csv"
          className="hidden"
          onChange={onInputChange}
          disabled={isLoading}
        />

        <div className="flex flex-col items-center gap-3">
          {isLoading ? (
            <Loader2 className="w-10 h-10 text-slate-400 animate-spin" />
          ) : (
            <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
              <Upload className="w-6 h-6 text-slate-500" />
            </div>
          )}

          <div className="space-y-1">
            {isUploading && (
              <>
                <p className="font-medium text-slate-700">Parsing your transactions...</p>
                <p className="text-sm text-slate-400">Reading and normalizing your CSV</p>
              </>
            )}
            {isAnalyzing && (
              <>
                <p className="font-medium text-slate-700">
                  Analyzing {parsed?.transactionCount} transactions...
                </p>
                <p className="text-sm text-slate-400">
                  AI is finding patterns, subscriptions, and anomalies
                </p>
              </>
            )}
            {!isLoading && (
              <>
                <p className="font-medium text-slate-700">Drop your bank CSV here</p>
                <p className="text-sm text-slate-400">
                  or click to browse — Chase, BofA, Wells Fargo, and more
                </p>
              </>
            )}
          </div>
        </div>
      </label>

      {error && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-3 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="bg-slate-50 border rounded-lg px-4 py-3 space-y-1">
        <p className="text-xs font-medium text-slate-600">How to export your CSV</p>
        <div className="grid grid-cols-2 gap-x-4 text-xs text-slate-400">
          {[
            ['Chase', 'Account activity → Download'],
            ['Bank of America', 'Download → CSV'],
            ['Wells Fargo', 'Download Account Activity'],
            ['Any bank', 'Look for "Export" or "Download"'],
          ].map(([bank, instruction]) => (
            <div key={bank} className="flex items-start gap-1 py-0.5">
              <FileText className="w-3 h-3 mt-0.5 shrink-0" />
              <span><span className="text-slate-500">{bank}:</span> {instruction}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}