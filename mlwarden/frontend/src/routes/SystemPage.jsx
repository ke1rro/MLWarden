import { MetricCard } from '@/components/common/MetricCard.jsx'
import { ErrorState } from '@/components/common/ErrorState.jsx'
import { LoadingState } from '@/components/common/LoadingState.jsx'
import { AppLayout } from '@/components/layout/AppLayout.jsx'
import { SystemMetricsGrid } from '@/components/system/SystemMetricsGrid.jsx'
import { formatSystemMetricValue, useSystemMetrics } from '@/hooks/useSystemMetrics.js'

export default function SystemPage() {
  const system = useSystemMetrics()

  return (
    <AppLayout
      breadcrumbs={[{ label: 'MLWarden', to: '/workspace' }, { label: 'System' }]}
      title="System"
      subtitle="Host telemetry for CPU, GPU, memory, and disk usage."
    >
      {system.isLoading ? <LoadingState message="Loading system metrics..." /> : null}
      {system.error ? <ErrorState message={system.error} /> : null}
      <div className="metric-grid system-overview-grid">
        {system.metrics.map((metric) => (
          <MetricCard key={metric.id} label={metric.label} value={formatSystemMetricValue(metric)} detail={metric.detail} />
        ))}
      </div>
      <SystemMetricsGrid history={system.history} metrics={system.metrics} />
    </AppLayout>
  )
}
