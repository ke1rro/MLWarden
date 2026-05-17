import { MetricCard } from '@/components/common/MetricCard.jsx'

export function ProjectSummaryCards({ summary }) {
  return (
    <div className="metric-grid">
      <MetricCard label="Projects" value={summary.totalProjects} detail={`${summary.activeProjects} active workspaces`} />
      <MetricCard label="Running" value={summary.runningRuns} detail="live worker updates" />
      <MetricCard label="Failed" value={summary.failedRuns} detail="needs inspection" />
      <MetricCard label="Latest run" value={summary.latestActivity} detail={summary.latestRunName} />
    </div>
  )
}
