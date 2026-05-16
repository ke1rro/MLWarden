import { Link } from 'react-router-dom'
import { loadWorkspaceSnapshot } from '@/api/workspace.js'
import { EmptyState } from '@/components/common/EmptyState.jsx'
import { ErrorState } from '@/components/common/ErrorState.jsx'
import { LoadingState } from '@/components/common/LoadingState.jsx'
import { MetricCard } from '@/components/common/MetricCard.jsx'
import { PageHeader } from '@/components/common/PageHeader.jsx'
import { AppLayout } from '@/components/layout/AppLayout.jsx'
import { useEffect, useMemo, useState } from 'react'

export default function WorkspacePage() {
  const [snapshot, setSnapshot] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    loadWorkspaceSnapshot()
      .then((data) => {
        if (!cancelled) setSnapshot(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to load workspace.')
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const summary = useMemo(() => {
    const projects = snapshot?.projects || []
    const runs = snapshot?.runs || []
    return {
      projects: projects.length,
      runs: runs.length,
      running: runs.filter((run) => run.status === 'running').length,
      charts: snapshot?.charts?.length || 0,
    }
  }, [snapshot])

  return (
    <AppLayout breadcrumbs={[{ label: 'MLWarden', to: '/workspace' }, { label: 'Workspace' }]}>
      <PageHeader
        title="Workspace"
        subtitle="Overview of the local MLWarden instance across projects, runs, charts, and artifacts."
        actions={<Link className="button button-primary button-md" to="/projects">Manage projects</Link>}
      />
      {isLoading ? <LoadingState message="Loading workspace..." /> : null}
      {error ? <ErrorState message={error} /> : null}
      {!isLoading && !error && snapshot ? (
        <>
          <div className="metric-grid">
            <MetricCard label="Projects" value={summary.projects} detail="local workspaces" />
            <MetricCard label="Runs" value={summary.runs} detail="tracked experiments" />
            <MetricCard label="Running" value={summary.running} detail="active workers" />
            <MetricCard label="Charts" value={summary.charts} detail="saved views" />
          </div>
          {!snapshot.projects.length ? (
            <EmptyState title="No projects yet." message="Create a project or point a worker script at the API to populate the workspace." />
          ) : (
            <div className="workspace-overview-grid">
              <section className="panel">
                <header className="section-header">
                  <div>
                    <h2>Projects</h2>
                    <p>Most recent local workspaces.</p>
                  </div>
                  <Link className="button button-secondary button-md" to="/projects">All projects</Link>
                </header>
                <div className="summary-list">
                  {snapshot.projects.slice(0, 6).map((project) => (
                    <Link data-search-text={`${project.name} ${project.description}`} key={project.id} to={`/projects/${project.id}`}>
                      <strong>{project.name}</strong>
                      <span>{project.stats.runs} runs · latest {project.latestRun}</span>
                    </Link>
                  ))}
                </div>
              </section>
              <section className="panel">
                <header className="section-header">
                  <div>
                    <h2>Recent runs</h2>
                    <p>Latest runs from all projects.</p>
                  </div>
                  <Link className="button button-secondary button-md" to="/runs">All runs</Link>
                </header>
                <div className="summary-list">
                  {snapshot.runs.slice(0, 6).map((run) => (
                    <Link data-search-text={`${run.name} ${run.projectName} ${run.status}`} key={run.id} to={`/runs/${run.id}`}>
                      <strong>{run.name}</strong>
                      <span>{run.projectName} · {run.status} · {run.duration}</span>
                    </Link>
                  ))}
                </div>
              </section>
            </div>
          )}
        </>
      ) : null}
    </AppLayout>
  )
}
