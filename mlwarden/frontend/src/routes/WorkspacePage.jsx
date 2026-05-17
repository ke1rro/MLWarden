import { Link } from 'react-router-dom'
import { EmptyState } from '@/components/common/EmptyState.jsx'
import { ErrorState } from '@/components/common/ErrorState.jsx'
import { LoadingState } from '@/components/common/LoadingState.jsx'
import { MetricCard } from '@/components/common/MetricCard.jsx'
import { AppLayout } from '@/components/layout/AppLayout.jsx'
import { useWorkspaceOverview } from '@/hooks/useWorkspaceOverview.js'

function WorkspaceSummaryCards({ summary }) {
  return (
    <div className="metric-grid">
      <MetricCard label="Projects" value={summary.projects} detail="local workspaces" />
      <MetricCard label="Runs" value={summary.runs} detail="tracked experiments" />
      <MetricCard label="Running" value={summary.running} detail="active workers" />
      <MetricCard label="Charts" value={summary.charts} detail="saved views" />
    </div>
  )
}

function WorkspaceListSection({ actionLabel, children, subtitle, title, to }) {
  return (
    <section className="panel">
      <header className="section-header">
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
        <Link className="button button-secondary button-md" to={to}>{actionLabel}</Link>
      </header>
      <div className="summary-list">{children}</div>
    </section>
  )
}

function WorkspaceProjectLink({ project }) {
  return (
    <Link data-search-text={`${project.name} ${project.description}`} to={`/projects/${project.id}`}>
      <strong>{project.name}</strong>
      <span>{project.stats.runs} runs · latest {project.latestRun}</span>
    </Link>
  )
}

function WorkspaceRunLink({ run }) {
  return (
    <Link data-search-text={`${run.name} ${run.projectName} ${run.status}`} to={`/runs/${run.id}`}>
      <strong>{run.name}</strong>
      <span>{run.projectName} · {run.status} · {run.duration}</span>
    </Link>
  )
}

function WorkspaceOverview({ snapshot, summary }) {
  if (!snapshot.projects.length) {
    return (
      <>
        <WorkspaceSummaryCards summary={summary} />
        <EmptyState title="No projects yet." message="Create a project or point a worker script at the API to populate the workspace." />
      </>
    )
  }

  return (
    <>
      <WorkspaceSummaryCards summary={summary} />
      <div className="workspace-overview-grid">
        <WorkspaceListSection actionLabel="All projects" subtitle="Most recent local workspaces." title="Projects" to="/projects">
          {snapshot.projects.slice(0, 6).map((project) => <WorkspaceProjectLink key={project.id} project={project} />)}
        </WorkspaceListSection>
        <WorkspaceListSection actionLabel="All runs" subtitle="Latest runs from all projects." title="Recent runs" to="/runs">
          {snapshot.runs.slice(0, 6).map((run) => <WorkspaceRunLink key={run.id} run={run} />)}
        </WorkspaceListSection>
      </div>
    </>
  )
}

export default function WorkspacePage() {
  const workspace = useWorkspaceOverview()
  return (
    <AppLayout
      breadcrumbs={[{ label: 'MLWarden', to: '/workspace' }, { label: 'Workspace' }]}
      title="Workspace"
      subtitle="Overview of the local MLWarden instance across projects, runs, charts, and artifacts."
    >
      {workspace.isLoading ? <LoadingState message="Loading workspace..." /> : null}
      {workspace.error ? <ErrorState message={workspace.error} /> : null}
      {!workspace.isLoading && !workspace.error && workspace.snapshot ? (
        <WorkspaceOverview snapshot={workspace.snapshot} summary={workspace.summary} />
      ) : null}
    </AppLayout>
  )
}
