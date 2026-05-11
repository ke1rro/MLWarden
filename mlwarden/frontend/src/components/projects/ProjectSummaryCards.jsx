import { projects, runs } from '../../mockData.js'
import { MetricCard } from '../common/MetricCard.jsx'

export function ProjectSummaryCards() {
  const running = runs.filter((run) => run.status === 'running').length
  const failed = runs.filter((run) => run.status === 'failed').length

  return (
    <div className="metric-grid">
      <MetricCard label="Total projects" value={projects.length} detail="4 active workspaces" />
      <MetricCard label="Running runs" value={running} detail="live worker updates" />
      <MetricCard label="Failed runs" value={failed} detail="needs inspection" />
      <MetricCard label="Latest activity" value="10:16" detail="dulcet-snowflake-18" />
    </div>
  )
}
