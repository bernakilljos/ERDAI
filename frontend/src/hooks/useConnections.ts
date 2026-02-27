import { useState } from 'react'
import { connectionApi } from '../api/connectionApi'
import type { ConnectionFormValues } from '../lib/connectionSchema'
import type { TestResult } from '../types/connection'

export type TestStatus = 'idle' | 'testing' | 'ok' | 'fail'

export function useConnections(onSaveSuccess?: () => void, projectId?: string) {
  const [testStatus, setTestStatus] = useState<TestStatus>('idle')
  const [testResult, setTestResult] = useState<TestResult | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const testConnection = async (data: ConnectionFormValues) => {
    setTestStatus('testing')
    setTestResult(null)
    setSaveSuccess(false)
    try {
      const result = await connectionApi.test(data)
      setTestStatus(result.success ? 'ok' : 'fail')
      setTestResult(result)
    } catch (err) {
      setTestStatus('fail')
      setTestResult({ success: false, message: (err as Error).message })
    }
  }

  const saveConnection = async (data: ConnectionFormValues) => {
    setSaveError(null)
    setSaveSuccess(false)
    setIsSaving(true)
    try {
      await connectionApi.save(data, projectId)
      setSaveSuccess(true)
      onSaveSuccess?.()
    } catch (err) {
      setSaveError((err as Error).message)
    } finally {
      setIsSaving(false)
    }
  }

  return {
    testStatus,
    testResult,
    isSaving,
    saveError,
    saveSuccess,
    testConnection,
    saveConnection,
    projectId,
  }
}
