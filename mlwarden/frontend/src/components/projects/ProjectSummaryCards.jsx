import { MetricCard } from '@/components/common/MetricCard.jsx'

export function ProjectSummaryCards({ summary }) {
  return (
    <div className="metric-grid">
      <MetricCard label="Total projects" value={summary.totalProjects} detail={`${summary.activeProjects} active workspaces`} />
      <MetricCard label="Running runs" value={summary.runningRuns} detail="live worker updates" />
      <MetricCard label="Failed runs" value={summary.failedRuns} detail="needs inspection" />
      <MetricCard label="Latest activity" value={summary.latestActivity} detail={summary.latestRunName} />
    </div>
  )
}
