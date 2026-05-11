import { Plus, Settings } from 'lucide-react'
import { useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { MetricChart } from '@/components/charts/MetricChart.jsx'
import { Button } from '@/components/common/Button.jsx'
import { MetricCard } from '@/components/common/MetricCard.jsx'
import { PageHeader } from '@/components/common/PageHeader.jsx'
import { SearchInput } from '@/components/common/SearchInput.jsx'
import { Toolbar } from '@/components/common/Toolbar.jsx'
import { AppLayout } from '@/components/layout/AppLayout.jsx'
import { RunTable } from '@/components/runs/RunTable.jsx'
import { trackerApi } from '@/api/TrackerApi.js'

const statusOptions = ['created', 'running', 'finished', 'failed', 'cancelled']

function ProjectTags({ tags }) {
  return (
    <div className="tag-row">
      {tags.map((item) => <span className="tag" key={item}>{item}</span>)}
    </div>
  )
}

function ProjectMetricSummary({ stats }) {
  return (
    <div className="metric-grid">
      <MetricCard label="Runs" value={stats.runs} detail="total" />
      <MetricCard label="Running" value={stats.running} detail="active workers" />
      <MetricCard label="Finished" value={stats.finished} detail="completed" />
      <MetricCard label="Failed" value={stats.failed} detail="needs review" />
    </div>
  )
}

function ProjectRunFilters({ query, status, tag, tags, onQueryChange, onStatusChange, onTagChange }) {
  return (
    <Toolbar>
      <SearchInput value={query} onChange={onQueryChange} placeholder="Search run names" />
      <select value={status} onChange={(event) => onStatusChange(event.target.value)}>
        <option value="all">All statuses</option>
        {statusOptions.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
      <select value={tag} onChange={(event) => onTagChange(event.target.value)}>
        {tags.map((item) => <option key={item} value={item}>{item}</option>)}
      </select>
      <input placeholder="Metric search: val.psnr > 30" />
      <input placeholder="Date range" />
    </Toolbar>
  )
}

function SavedChartPanel({ chart, previewSeries }) {
  return (
    <article className="chart-panel">
      <header className="chart-panel-header"><h3>{chart.name}</h3></header>
      <MetricChart title={chart.metric} series={previewSeries[chart.metric]} type={chart.type} area={chart.type === 'area'} />
    </article>
  )
}

function SavedChartsSection({ project, savedCharts, previewSeries }) {
  return (
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
          <SavedChartPanel chart={chart} key={chart.id} previewSeries={previewSeries} />
        ))}
      </div>
    </section>
  )
}

export default function ProjectDetailPage() {
  const { projectId } = useParams()
  const workspace = trackerApi.getProjectWorkspace(projectId)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [tag, setTag] = useState('all')

  if (!workspace) {
    return <Navigate to="/projects" replace />
  }

  const { project, runs: projectRuns, savedCharts, previewSeries } = workspace
  const tags = ['all', ...new Set(projectRuns.flatMap((run) => run.tags))]
  const filteredRuns = projectRuns.filter((run) => {
    const matchesStatus = status === 'all' || run.status === status
    const matchesTag = tag === 'all' || run.tags.includes(tag)
    const matchesQuery = `${run.name} ${run.description} ${run.worker}`.toLowerCase().includes(query.toLowerCase())
    return matchesStatus && matchesTag && matchesQuery
  })

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
      <ProjectTags tags={project.tags} />
      <ProjectMetricSummary stats={project.stats} />
      <ProjectRunFilters
        query={query}
        status={status}
        tag={tag}
        tags={tags}
        onQueryChange={setQuery}
        onStatusChange={setStatus}
        onTagChange={setTag}
      />
      <RunTable runs={filteredRuns} />
      <SavedChartsSection project={project} savedCharts={savedCharts} previewSeries={previewSeries} />
    </AppLayout>
  )
}
