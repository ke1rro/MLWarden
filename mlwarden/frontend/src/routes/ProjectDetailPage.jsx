import { Plus, Settings } from 'lucide-react'
import { useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { MetricChart } from '../components/charts/MetricChart.jsx'
import { Button } from '../components/common/Button.jsx'
import { MetricCard } from '../components/common/MetricCard.jsx'
import { PageHeader } from '../components/common/PageHeader.jsx'
import { SearchInput } from '../components/common/SearchInput.jsx'
import { Toolbar } from '../components/common/Toolbar.jsx'
import { AppLayout } from '../components/layout/AppLayout.jsx'
import { RunTable } from '../components/runs/RunTable.jsx'
import { getProject, getProjectStats, getRunsForProject, metricSeriesByRunId, savedChartsByProjectId } from '../mockData.js'

export default function ProjectDetailPage() {
  const { projectId } = useParams()
  const project = getProject(projectId)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [tag, setTag] = useState('all')
  const projectRuns = project ? getRunsForProject(project.id) : []
  const stats = project ? getProjectStats(project.id) : { runs: 0, running: 0, failed: 0, finished: 0 }
  const tags = ['all', ...new Set(projectRuns.flatMap((run) => run.tags))]
  const filteredRuns = projectRuns.filter((run) => {
    const matchesStatus = status === 'all' || run.status === status
    const matchesTag = tag === 'all' || run.tags.includes(tag)
    const matchesQuery = `${run.name} ${run.description} ${run.worker}`.toLowerCase().includes(query.toLowerCase())
    return matchesStatus && matchesTag && matchesQuery
  })
  if (!project) {
    return <Navigate to="/projects" replace />
  }

  const savedCharts = savedChartsByProjectId[project.id] || []
  const previewSeries = metricSeriesByRunId[projectRuns[0]?.id] || {}

  return (
    <AppLayout breadcrumbs={['MLWarden', 'Projects', project.name]}>
      <PageHeader
        title={project.name}
        subtitle={project.description}
        actions={(
          <>
            <Button><Plus size={15} /> New run</Button>
            <Link className="button button-secondary button-md" to={`/projects/${project.id}/charts`}>Open charts</Link>
            <Button variant="secondary"><Settings size={15} /> Settings</Button>
          </>
        )}
      />
      <div className="tag-row">
        {project.tags.map((item) => <span className="tag" key={item}>{item}</span>)}
      </div>
      <div className="metric-grid">
        <MetricCard label="Runs" value={stats.runs} detail="total" />
        <MetricCard label="Running" value={stats.running} detail="active workers" />
        <MetricCard label="Finished" value={stats.finished} detail="completed" />
        <MetricCard label="Failed" value={stats.failed} detail="needs review" />
      </div>
      <Toolbar>
        <SearchInput value={query} onChange={setQuery} placeholder="Search run names" />
        <select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="all">All statuses</option>
          <option value="created">Created</option>
          <option value="running">Running</option>
          <option value="finished">Finished</option>
          <option value="failed">Failed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select value={tag} onChange={(event) => setTag(event.target.value)}>
          {tags.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <input placeholder="Metric search: val.psnr > 30" />
        <input placeholder="Date range" />
      </Toolbar>
      <RunTable runs={filteredRuns} />
      <section className="saved-charts">
        <header className="section-header">
          <div>
            <h2>Saved charts</h2>
            <p>Project-level chart configurations with mock preview data.</p>
          </div>
          <Link className="button button-secondary button-md" to={`/projects/${project.id}/charts`}>Chart builder</Link>
        </header>
        <div className="chart-grid compact-grid">
          {savedCharts.map((chart) => (
            <article className="chart-panel" key={chart.id}>
              <header className="chart-panel-header"><h3>{chart.name}</h3></header>
              <MetricChart title={chart.metric} series={previewSeries[chart.metric]} type={chart.type} area={chart.type === 'area'} />
            </article>
          ))}
        </div>
      </section>
    </AppLayout>
  )
}
