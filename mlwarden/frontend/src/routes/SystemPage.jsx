import { Activity, Cpu, Database, HardDrive } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { getSystemMetrics } from '@/api/system.js'
import { MetricChart } from '@/components/charts/MetricChart.jsx'
import { buildChartOption } from '@/components/charts/chartOptions.js'
import { MetricCard } from '@/components/common/MetricCard.jsx'
import { ErrorState } from '@/components/common/ErrorState.jsx'
import { LoadingState } from '@/components/common/LoadingState.jsx'
import { PageHeader } from '@/components/common/PageHeader.jsx'
import { AppLayout } from '@/components/layout/AppLayout.jsx'

const iconByMetric = {
  'gpu-temp': Activity,
  'cpu-temp': Cpu,
  'gpu-usage': Activity,
  'cpu-usage': Cpu,
  memory: Database,
  disk: HardDrive,
}

const areaMetrics = new Set(['gpu-usage', 'cpu-usage', 'memory'])

function formatValue(metric) {
  if (!metric.available || metric.value === null || metric.value === undefined) return 'n/a'
  return `${metric.value}${metric.unit ? ` ${metric.unit}` : ''}`
}

function seriesFor(history, metricId) {
  return history
    .map((sample) => {
      const metric = sample.metrics.find((item) => item.id === metricId)
      if (!metric?.available) return null
      return { step: sample.label, timestamp: sample.label, value: metric.value }
    })
    .filter(Boolean)
}

function unitLabel(unit) {
  if (unit === 'C') return '°C'
  return unit || 'value'
}

function systemChartOption(metric, series, type) {
  const unit = unitLabel(metric.unit)
  return buildChartOption({
    chartType: type,
    title: metric.label,
    showTitle: false,
    subtitle: metric.detail || 'host telemetry',
    metric: metric.id,
    yAxis: metric.id,
    xAxis: 'timestamp',
    xAxisLabel: 'Time',
    yAxisLabel: `${metric.label} (${unit})`,
    showXAxisLabel: true,
    showYAxisLabel: true,
    valueUnit: unit,
    showToolbox: true,
    showDataZoom: true,
    showLegend: false,
    showTooltip: true,
    color: areaMetrics.has(metric.id) ? '#2563eb' : '#0f766e',
    fontSize: 12,
    lineWidth: 2,
    pointSize: 4,
    smooth: true,
    area: areaMetrics.has(metric.id),
    grid: { left: 64, right: 24, top: 66, bottom: 92 },
  }, series)
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
      <section className="system-metrics-grid">
        {metrics.map((metric) => {
          const Icon = iconByMetric[metric.id] || Activity
          const type = areaMetrics.has(metric.id) ? 'area' : 'line'
          const series = seriesFor(history, metric.id)
          const option = systemChartOption(metric, series, type)
          return (
            <article className="chart-panel system-metric-panel" key={metric.id}>
              <header className="chart-panel-header">
                <h3>{metric.label}</h3>
                <Icon size={16} />
              </header>
              <MetricChart option={option} />
            </article>
          )
        })}
      </section>
    </AppLayout>
  )
}
