import { Activity, Cpu, Database, HardDrive } from 'lucide-react'
import { MetricChart } from '@/components/charts/MetricChart.jsx'
import { buildChartOption } from '@/components/charts/chartOptions.js'

const iconByMetric = {
  'gpu-temp': Activity,
  'cpu-temp': Cpu,
  'gpu-usage': Activity,
  'cpu-usage': Cpu,
  memory: Database,
  disk: HardDrive,
}

const areaMetrics = new Set(['gpu-usage', 'cpu-usage', 'memory'])

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

function SystemMetricPanel({ history, metric }) {
  const Icon = iconByMetric[metric.id] || Activity
  const type = areaMetrics.has(metric.id) ? 'area' : 'line'
  const series = seriesFor(history, metric.id)
  const option = systemChartOption(metric, series, type)

  return (
    <article className="chart-panel system-metric-panel">
      <header className="chart-panel-header">
        <h3>{metric.label}</h3>
        <Icon size={16} />
      </header>
      <MetricChart option={option} />
    </article>
  )
}

export function SystemMetricsGrid({ history, metrics }) {
  return (
    <section className="system-metrics-grid">
      {metrics.map((metric) => (
        <SystemMetricPanel history={history} key={metric.id} metric={metric} />
      ))}
    </section>
  )
}
