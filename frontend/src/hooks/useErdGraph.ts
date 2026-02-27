import { useCallback, useEffect, useState } from 'react'
import type { ErdGraph } from '../types/erd'
import { erdApi } from '../api/erdApi'

export interface SyncProgress {
  step: 'connect' | 'extract' | 'infer' | 'save' | 'done' | 'error'
  message: string
  progress: number
  graph?: ErdGraph
}

export function useErdGraph(projectId?: string) {
  const [graph, setGraph] = useState<ErdGraph | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!projectId) return
    setIsLoading(true)
    setError(null)
    try {
      const data = await erdApi.get(projectId)
      setGraph(data)
    } catch (err) {
      setError((err as Error).message)
      setGraph(null)
    } finally {
      setIsLoading(false)
    }
  }, [projectId])

  const sync = useCallback(
    async (
      connectionId?: string,
      onProgress?: (step: SyncProgress) => void,
    ): Promise<ErdGraph | null> => {
      if (!projectId) return null
      setIsLoading(true)
      setError(null)

      try {
        const url = `/erd/${projectId}/sync`
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(connectionId ? { connectionId } : {}),
        })

        if (!res.ok || !res.body) {
          const body = await res.json().catch(() => ({}))
          const message = (body as { message?: string }).message ?? `요청 실패 (${res.status})`
          if (res.status === 401) {
            window.location.href = '/login'
          }
          throw new Error(message)
        }

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buf = ''
        let resultGraph: ErdGraph | null = null

        while (true) {
          const { value, done } = await reader.read()
          if (done) break
          buf += decoder.decode(value, { stream: true })

          // SSE 이벤트 파싱: `data: {...}\n\n`
          const parts = buf.split('\n\n')
          buf = parts.pop() ?? ''

          for (const part of parts) {
            const line = part.trim()
            if (!line.startsWith('data:')) continue
            let event: SyncProgress | null = null
            try {
              event = JSON.parse(line.slice(5).trim()) as SyncProgress
            } catch {
              continue // 파싱 실패 무시
            }
            onProgress?.(event)
            if (event.step === 'done' && event.graph) {
              resultGraph = event.graph
              setGraph(event.graph)
            } else if (event.step === 'error') {
              // setError 호출 후 루프 탈출
              setError(event.message)
              return null
            }
          }
        }

        return resultGraph
      } catch (err) {
        const msg = (err as Error).message
        setError(msg)
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [projectId],
  )

  // projectId 변경 시 이전 그래프 즉시 초기화 (stale data 방지)
  useEffect(() => {
    setGraph(null)
    setError(null)
  }, [projectId])

  useEffect(() => {
    void load()
  }, [load])

  return { graph, isLoading, error, load, sync }
}
