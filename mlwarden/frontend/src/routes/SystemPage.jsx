import { useEffect, useMemo, useState } from 'react'
import { getSystemMetrics } from '@/api/system.js'
import { MetricCard } from '@/components/common/MetricCard.jsx'
import { ErrorState } from '@/components/common/ErrorState.jsx'
import { LoadingState } from '@/components/common/LoadingState.jsx'
import { PageHeader } from '@/components/common/PageHeader.jsx'
import { AppLayout } from '@/components/layout/AppLayout.jsx'
import { SystemMetricsGrid } from '@/components/system/SystemMetricsGrid.jsx'

function formatValue(metric) {
  if (!metric.available || metric.value === null || metric.value === undefined) return 'n/a'
  return `${metric.value}${metric.unit ? ` ${metric.unit}` : ''}`
}

export default function SystemPage() {
  const [snapshot, setSnapshot] = useState(null)
  const [history, setHistory] = useState([])
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function loadMetrics() {
      try {
        const data = await getSystemMetrics()
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
  }, [])

  const metrics = useMemo(() => snapshot?.metrics || [], [snapshot])

  return (
    <AppLayout breadcrumbs={[{ label: 'MLWarden', to: '/workspace' }, { label: 'System' }]}>
      <PageHeader
        title="System"
        subtitle="Local training host telemetry for GPU, CPU, memory, and disk pressure."
      />
      {isLoading ? <LoadingState message="Loading system metrics..." /> : null}
      {error ? <ErrorState message={error} /> : null}
      <div className="metric-grid system-overview-grid">
        {metrics.map((metric) => (
          <MetricCard key={metric.id} label={metric.label} value={formatValue(metric)} detail={metric.detail} />
        ))}
      </div>
      <SystemMetricsGrid history={history} metrics={metrics} />
    </AppLayout>
  )
}
