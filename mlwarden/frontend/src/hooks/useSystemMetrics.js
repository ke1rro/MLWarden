import { useEffect, useMemo, useState } from 'react'
import { systemApi } from '@/api/system.js'

const HISTORY_LIMIT = 240

export function formatSystemMetricValue(metric) {
  if (!metric.available || metric.value === null || metric.value === undefined) return 'Unavailable'
  return `${metric.value}${metric.unit ? ` ${metric.unit}` : ''}`
}

function formatSampleLabel(timestamp) {
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(timestamp))
}

function normalizeSample(sample) {
  return {
    ...sample,
    label: sample.label || formatSampleLabel(sample.timestamp),
    metrics: sample.metrics || [],
  }
}

function appendSamples(current, samples) {
  const seen = new Set(current.map((sample) => sample.timestamp))
  const merged = [...current]
  samples.forEach((sample) => {
    if (!seen.has(sample.timestamp)) {
      seen.add(sample.timestamp)
      merged.push(sample)
    }
  })
  return merged.slice(-HISTORY_LIMIT)
}

export function useSystemMetrics({ api = systemApi } = {}) {
  const [snapshot, setSnapshot] = useState(null)
  const [history, setHistory] = useState([])
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    let latestTimestamp = ''

    async function loadInitialHistory() {
      try {
        const data = await api.getMetricsHistory({ limit: HISTORY_LIMIT })
        if (cancelled) return

        const samples = (data.samples || []).map(normalizeSample)
        const latestSample = samples.at(-1)
        latestTimestamp = latestSample?.timestamp || ''
        setHistory(samples)

        if (latestSample) {
          setSnapshot(latestSample)
        } else {
          const liveSnapshot = await api.getMetrics()
          if (cancelled) return
          setSnapshot(liveSnapshot)
        }
        setError('')
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load system metrics.')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    async function loadNewHistory() {
      try {
        const data = await api.getMetricsHistory(
          latestTimestamp ? { since: latestTimestamp } : { limit: HISTORY_LIMIT },
        )
        if (cancelled) return

        const samples = (data.samples || []).map(normalizeSample)
        const latestSample = samples.at(-1)
        if (latestSample) {
          latestTimestamp = latestSample.timestamp
          setSnapshot(latestSample)
          setHistory((current) => appendSamples(current, samples))
        }
        setError('')
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load system metrics.')
      }
    }

    loadInitialHistory()
    const interval = window.setInterval(loadNewHistory, 5000)
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
