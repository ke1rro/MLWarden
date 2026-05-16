import { Activity, Cpu, Database, HardDrive } from 'lucide-react'
import { MetricChart } from '@/components/charts/MetricChart.jsx'
import { MetricCard } from '@/components/common/MetricCard.jsx'
import { PageHeader } from '@/components/common/PageHeader.jsx'
import { AppLayout } from '@/components/layout/AppLayout.jsx'

const samples = Array.from({ length: 32 }, (_, index) => index + 1)

function buildSeries(base, swing, stepSize = 1) {
  return samples.map((step, index) => ({
    step: step * stepSize,
    value: Number((base + Math.sin(index / 2.4) * swing + Math.cos(index / 4.8) * swing * 0.6).toFixed(2)),
  }))
}

const metrics = [
  {
    id: 'gpu-temp',
    label: 'GPU temp',
    value: '68 C',
    detail: 'NVIDIA device 0',
    icon: Activity,
    series: buildSeries(66, 5),
    type: 'line',
  },
  {
    id: 'cpu-temp',
    label: 'CPU temp',
    value: '54 C',
    detail: 'package sensor',
    icon: Cpu,
    series: buildSeries(52, 4),
    type: 'line',
  },
  {
    id: 'gpu-usage',
    label: 'GPU usage',
    value: '84%',
    detail: 'training load',
    icon: Activity,
    series: buildSeries(78, 14),
    type: 'area',
  },
  {
    id: 'cpu-usage',
    label: 'CPU usage',
    value: '46%',
    detail: 'worker process',
    icon: Cpu,
    series: buildSeries(41, 10),
    type: 'area',
  },
  {
    id: 'memory',
    label: 'Memory',
    value: '61%',
    detail: '31.2 / 51.2 GB',
    icon: Database,
    series: buildSeries(58, 7),
    type: 'area',
  },
  {
    id: 'disk',
    label: 'Disk',
    value: '72%',
    detail: 'workspace volume',
    icon: HardDrive,
    series: buildSeries(70, 2),
    type: 'line',
  },
]

export default function SystemPage() {
  return (
    <AppLayout breadcrumbs={[{ label: 'MLWarden', to: '/projects' }, { label: 'System' }]}>
      <PageHeader
        title="System"
        subtitle="Local training host telemetry for GPU, CPU, memory, and disk pressure."
      />
      <div className="metric-grid system-overview-grid">
        {metrics.map((metric) => (
          <MetricCard key={metric.id} label={metric.label} value={metric.value} detail={metric.detail} />
        ))}
      </div>
      <section className="system-metrics-grid">
        {metrics.map((metric) => {
          const Icon = metric.icon
          return (
            <article className="chart-panel system-metric-panel" key={metric.id}>
              <header className="chart-panel-header">
                <h3>{metric.label}</h3>
                <Icon size={16} />
              </header>
              <MetricChart title={metric.label} series={metric.series} type={metric.type} area={metric.type === 'area'} />
            </article>
          )
        })}
      </section>
    </AppLayout>
  )
}
