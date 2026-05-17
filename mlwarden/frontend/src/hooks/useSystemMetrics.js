import { useEffect, useMemo, useState } from 'react'
import { systemApi } from '@/api/system.js'

export function formatSystemMetricValue(metric) {
  if (!metric.available || metric.value === null || metric.value === undefined) return 'n/a'
  return `${metric.value}${metric.unit ? ` ${metric.unit}` : ''}`
}

export function useSystemMetrics({ api = systemApi } = {}) {
  const [snapshot, setSnapshot] = useState(null)
  const [history, setHistory] = useState([])
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function loadMetrics() {
      try {
        const data = await api.getMetrics()
        if (cancelled) return
        const nextSample = {
          label: new Intl.DateTimeFormat(undefined, {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          }).format(new Date()),
          metrics: data.metrics || [],
        }
        setSnapshot(data)
        setHistory((current) => [...current.slice(-39), nextSample])
        setError('')
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load system metrics.')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    loadMetrics()
    const interval = window.setInterval(loadMetrics, 5000)
    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [api])

  const metrics = useMemo(() => snapshot?.metrics || [], [snapshot])

  return {
    error,
    history,
    isLoading,
    metrics,
  }
}
