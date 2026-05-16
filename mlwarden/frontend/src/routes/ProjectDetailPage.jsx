import { Plus, Settings } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom'
import { adaptProject, adaptRun } from '@/api/adapters.js'
import { listCharts } from '@/api/charts.js'
import { getMetricSummary, getMetrics } from '@/api/metrics.js'
import { getProject } from '@/api/projects.js'
import { listRunComparisons } from '@/api/runComparisons.js'
import { cancelRun, createRun, failRun, finishRun, listRuns, startRun } from '@/api/runs.js'
import { useNotifications } from '@/app/useNotifications.js'
import { Button } from '@/components/common/Button.jsx'
import { ErrorState } from '@/components/common/ErrorState.jsx'
import { LoadingState } from '@/components/common/LoadingState.jsx'
import { MetricCard } from '@/components/common/MetricCard.jsx'
import { Modal } from '@/components/common/Modal.jsx'
import { PageHeader } from '@/components/common/PageHeader.jsx'
import { SearchInput } from '@/components/common/SearchInput.jsx'
import { Toolbar } from '@/components/common/Toolbar.jsx'
import { AppLayout } from '@/components/layout/AppLayout.jsx'
import { RunTable } from '@/components/runs/RunTable.jsx'
import { RunComparisonWorkspace } from '@/components/runs/RunComparisonWorkspace.jsx'
import { MetricChart } from '@/components/charts/MetricChart.jsx'
import { buildChartOption, normalizeChartConfig } from '@/components/charts/chartOptions.js'

const statusOptions = ['created', 'running', 'finished', 'failed', 'cancelled']
const runPalette = ['#2563eb', '#16a34a', '#ef4444', '#7c3aed', '#db2777', '#a16207', '#84cc16', '#0891b2', '#f59e0b', '#06b6d4']
const refreshEvents = new Set([
  'backend.connected',
  'run.created',
  'run.started',
  'run.updated',
  'run.finished',
  'run.failed',
  'run.cancelled',
  'metric.logged',
  'chart.created',
])

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

function ProjectRunFilters({
  query,
  status,
  onQueryChange,
  onStatusChange,
}) {
  return (
    <Toolbar>
      <SearchInput value={query} onChange={onQueryChange} placeholder="Search run names" />
      <select value={status} onChange={(event) => onStatusChange(event.target.value)}>
        <option value="all">All statuses</option>
        {statusOptions.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </Toolbar>
  )
}

function SavedChartPanel({ chart, previewSeries }) {
  const config = normalizeChartConfig({ ...chart.config, name: chart.name, chartType: chart.chart_type || chart.type })
  const metric = config.metric || config.yAxis || chart.name
  const option = buildChartOption({ ...config, showTitle: false }, previewSeries[metric])

  return (
    <article className="chart-panel">
      <header className="chart-panel-header"><h3>{chart.name}</h3></header>
      <MetricChart option={option} />
    </article>
  )
}

function SavedChartsSection({ project, savedCharts, previewSeries }) {
  return (
    <section className="saved-charts">
      <header className="section-header">
        <div>
          <h2>Saved charts</h2>
          <p>Project-level chart configurations with preview data from the latest run.</p>
        </div>
        <Link className="button button-secondary button-md" to={`/projects/${project.id}/charts`}>Chart builder</Link>
      </header>
      <div className="chart-grid compact-grid">
        {savedCharts.map((chart) => (
          <div data-search-text={`${chart.name} ${project.name}`} key={chart.id}>
            <SavedChartPanel chart={chart} previewSeries={previewSeries} />
          </div>
        ))}
      </div>
    </section>
  )
}

export default function ProjectDetailPage() {
  const { projectId } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const initialSelectedRunIds = useMemo(() => (searchParams.get('runs') || '').split(',').map((item) => item.trim()).filter(Boolean), [searchParams])
  const [project, setProject] = useState(null)
  const [projectRuns, setProjectRuns] = useState([])
  const [savedCharts, setSavedCharts] = useState([])
  const [savedComparisons, setSavedComparisons] = useState([])
  const [runMetricNames, setRunMetricNames] = useState({})
  const [previewSeries, setPreviewSeries] = useState({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [runForm, setRunForm] = useState({ name: '', description: '', tags: '' })
  const [selectedRunIds, setSelectedRunIds] = useState(initialSelectedRunIds)
  const [isComparisonActive, setIsComparisonActive] = useState(initialSelectedRunIds.length >= 2)
  const [activeComparison, setActiveComparison] = useState(null)
  const lastSelectedRunIndex = useRef(null)
  const { subscribe } = useNotifications()

  const updateSelectedRunIds = useCallback((runIds) => {
    const nextRunIds = [...new Set(runIds)]
    setSelectedRunIds(nextRunIds)
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      if (nextRunIds.length) next.set('runs', nextRunIds.join(','))
      else next.delete('runs')
      return next
    }, { replace: true })
    if (nextRunIds.length < 2) setIsComparisonActive(false)
  }, [setSearchParams])

  const loadProjectWorkspace = useCallback(async () => {
    setError('')
    try {
      const [projectResponse, runsResponse, chartsResponse, comparisonsResponse] = await Promise.all([
        getProject(projectId),
        listRuns(projectId, { limit: 500 }),
        listCharts(projectId),
        listRunComparisons(projectId),
      ])
      const nextProject = adaptProject(projectResponse)
      const nextRuns = (runsResponse.items || []).map((run) => adaptRun(run))
      setProject(nextProject)
      setProjectRuns(nextRuns)
      setSavedCharts(chartsResponse.items || [])
      setSavedComparisons(comparisonsResponse.items || [])

      const metricEntries = await Promise.all(nextRuns.map(async (run) => {
        try {
          const summary = await getMetricSummary(run.id)
          return [run.id, (summary.items || []).map((item) => item.name)]
        } catch {
          return [run.id, []]
        }
      }))
      const metricNameMap = Object.fromEntries(metricEntries)
      setRunMetricNames(metricNameMap)

      if (nextRuns[0]) {
        const names = metricNameMap[nextRuns[0].id] || []
        const metrics = names.length ? await getMetrics(nextRuns[0].id, names) : { series: {} }
        setPreviewSeries(metrics.series || {})
      } else {
        setPreviewSeries({})
        setRunMetricNames({})
      }
    } catch (err) {
      setError(err.message || 'Failed to load project.')
    } finally {
      setIsLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    loadProjectWorkspace()
  }, [loadProjectWorkspace])

  useEffect(() => subscribe((message) => {
    if ((message.project_id === projectId || message.payload?.project_id === projectId || message.type === 'backend.connected') && refreshEvents.has(message.type)) {
      loadProjectWorkspace()
    }
  }), [loadProjectWorkspace, projectId, subscribe])

  const projectStats = useMemo(() => ({
    runs: projectRuns.length,
    running: projectRuns.filter((run) => run.status === 'running').length,
    finished: projectRuns.filter((run) => run.status === 'finished').length,
    failed: projectRuns.filter((run) => run.status === 'failed').length,
  }), [projectRuns])
  const selectableRunIds = useMemo(() => new Set(projectRuns.filter((run) => (runMetricNames[run.id] || []).length).map((run) => run.id)), [projectRuns, runMetricNames])
  const disabledRunIds = useMemo(() => projectRuns.filter((run) => !selectableRunIds.has(run.id)).map((run) => run.id), [projectRuns, selectableRunIds])
  const runColorMap = useMemo(() => Object.fromEntries(projectRuns.map((run, index) => [run.id, runPalette[index % runPalette.length]])), [projectRuns])
  const sharedMetrics = useMemo(() => {
    const metricSets = selectedRunIds
      .map((runId) => new Set(runMetricNames[runId] || []))
      .filter((metricSet) => metricSet.size)
    if (metricSets.length < 2) return []
    return [...metricSets[0]].filter((metric) => metricSets.every((metricSet) => metricSet.has(metric))).sort()
  }, [runMetricNames, selectedRunIds])
  const filteredRuns = projectRuns.filter((run) => {
    const matchesStatus = status === 'all' || run.status === status
    const matchesQuery = `${run.name} ${run.description} ${run.worker}`.toLowerCase().includes(query.toLowerCase())
    return matchesStatus && matchesQuery
  })
  function handleRunSelect(run, event, index) {
    if (!selectableRunIds.has(run.id)) return
    const shouldSelect = event.currentTarget.checked
    let nextRunIds = selectedRunIds
    if (event.shiftKey && lastSelectedRunIndex.current !== null) {
      const start = Math.min(lastSelectedRunIndex.current, index)
      const end = Math.max(lastSelectedRunIndex.current, index)
      const rangeIds = filteredRuns.slice(start, end + 1).filter((item) => selectableRunIds.has(item.id)).map((item) => item.id)
      nextRunIds = shouldSelect
        ? [...new Set([...selectedRunIds, ...rangeIds])]
        : selectedRunIds.filter((runId) => !rangeIds.includes(runId))
    } else {
      nextRunIds = shouldSelect ? [...selectedRunIds, run.id] : selectedRunIds.filter((runId) => runId !== run.id)
    }
    lastSelectedRunIndex.current = index
    updateSelectedRunIds(nextRunIds)
  }

  function handleResetComparison() {
    setActiveComparison(null)
    setIsComparisonActive(false)
    updateSelectedRunIds([])
  }

  function handleApplyComparison(comparison) {
    setActiveComparison(comparison)
    updateSelectedRunIds(comparison.run_ids || [])
    setIsComparisonActive(true)
  }

  async function handleCreateRun(event) {
    event.preventDefault()
    setIsCreating(true)
    setError('')
    try {
      await createRun(projectId, {
        name: runForm.name.trim() || null,
        description: runForm.description.trim() || null,
        tags: runForm.tags.split(',').map((item) => item.trim()).filter(Boolean),
        params: {},
        metadata: { source: 'frontend' },
      })
      setRunForm({ name: '', description: '', tags: '' })
      setIsCreateOpen(false)
      await loadProjectWorkspace()
    } catch (err) {
      setError(err.message || 'Failed to create run.')
    } finally {
      setIsCreating(false)
    }
  }

  async function handleRunAction(run, action) {
    setError('')
    try {
      if (action === 'start') await startRun(run.id)
      if (action === 'finish') await finishRun(run.id)
      if (action === 'fail') await failRun(run.id, { error_message: 'Marked failed from UI' })
      if (action === 'cancel') await cancelRun(run.id)
      await loadProjectWorkspace()
    } catch (err) {
      setError(err.message || 'Run action failed.')
    }
  }

  if (isLoading) {
    return (
      <AppLayout breadcrumbs={['MLWarden', 'Projects']}>
        <LoadingState message="Loading project..." />
      </AppLayout>
    )
  }

  if (!project && error) {
    return (
      <AppLayout breadcrumbs={[{ label: 'MLWarden', to: '/workspace' }, { label: 'Projects', to: '/projects' }]}>
        <ErrorState title="Project not available" message={error} />
      </AppLayout>
    )
  }

  if (!project) {
    return <Navigate to="/projects" replace />
  }

  return (
    <AppLayout breadcrumbs={[{ label: 'MLWarden', to: '/workspace' }, { label: project.name }]}>
      <PageHeader
        title={project.name}
        subtitle={project.description}
        actions={(
          <>
            <Button onClick={() => setIsCreateOpen((current) => !current)}><Plus size={15} /> New run</Button>
            <Link className="button button-secondary button-md" to={`/projects/${project.id}/charts`}>Open charts</Link>
            <Button onClick={() => setIsSettingsOpen(true)} variant="secondary"><Settings size={15} /> Settings</Button>
          </>
        )}
      />
      {isCreateOpen ? (
        <form className="panel inline-form" onSubmit={handleCreateRun}>
          <label>
            Run name
            <input value={runForm.name} onChange={(event) => setRunForm((current) => ({ ...current, name: event.target.value }))} />
          </label>
          <label>
            Description
            <input value={runForm.description} onChange={(event) => setRunForm((current) => ({ ...current, description: event.target.value }))} />
          </label>
          <label>
            Tags
            <input placeholder="baseline, resnet" value={runForm.tags} onChange={(event) => setRunForm((current) => ({ ...current, tags: event.target.value }))} />
          </label>
          <div className="button-row">
            <Button disabled={isCreating} type="submit">{isCreating ? 'Creating...' : 'Create run'}</Button>
            <Button onClick={() => setIsCreateOpen(false)} variant="secondary">Cancel</Button>
          </div>
        </form>
      ) : null}
      {error ? <ErrorState message={error} /> : null}
      {!isComparisonActive ? <ProjectTags tags={project.tags} /> : null}
      {!isComparisonActive ? <ProjectMetricSummary stats={projectStats} /> : null}
      {isComparisonActive ? (
        <RunComparisonWorkspace
          activeComparison={activeComparison}
          onApplyComparison={handleApplyComparison}
          onReset={handleResetComparison}
          onSaved={loadProjectWorkspace}
          project={project}
          savedComparisons={savedComparisons}
          selectedRunIds={selectedRunIds}
          sharedMetrics={sharedMetrics}
        />
      ) : (
        <>
          <ProjectRunFilters
            query={query}
            status={status}
            onQueryChange={setQuery}
            onStatusChange={setStatus}
          />
          <div className="comparison-action-bar panel">
            <div>
              <strong>{selectedRunIds.length} selected</strong>
              <p>Select two or more metric-bearing runs to create a combined comparison workspace.</p>
            </div>
            <div className="button-row">
              <Button disabled={selectedRunIds.length < 2} onClick={() => setIsComparisonActive(true)}>Combine Runs</Button>
              <Button disabled={!selectedRunIds.length} onClick={handleResetComparison} variant="secondary">Reset selection</Button>
            </div>
          </div>
          <RunTable
            disabledRunIds={disabledRunIds}
            onRunAction={handleRunAction}
            onRunSelect={handleRunSelect}
            runColorMap={runColorMap}
            runs={filteredRuns}
            selectable
            selectedRunIds={selectedRunIds}
          />
          <SavedChartsSection project={project} savedCharts={savedCharts} previewSeries={previewSeries} />
        </>
      )}
      {isSettingsOpen ? (
        <Modal title={`${project.name} settings`} description="Project metadata and local display settings." onClose={() => setIsSettingsOpen(false)}>
          <div className="project-settings-panel">
            <div className="metric-grid compact">
              <MetricCard label="Runs" value={projectStats.runs} detail="total" />
              <MetricCard label="Running" value={projectStats.running} detail="active" />
              <MetricCard label="Charts" value={savedCharts.length} detail="saved" />
            </div>
            <section className="settings-summary-card">
              <h3>Project profile</h3>
              <dl>
                <div><dt>Name</dt><dd>{project.name}</dd></div>
                <div><dt>Description</dt><dd>{project.description || 'No description'}</dd></div>
                <div><dt>Latest run</dt><dd>{project.latestRun}</dd></div>
              </dl>
            </section>
            <section className="settings-summary-card">
              <h3>Tags</h3>
              {project.tags.length ? <ProjectTags tags={project.tags} /> : <p className="muted-copy">No tags configured.</p>}
            </section>
            <section className="settings-summary-card">
              <h3>Metadata</h3>
              <pre className="metadata-panel">{JSON.stringify(project.metadata || {}, null, 2)}</pre>
            </section>
          </div>
        </Modal>
      ) : null}
    </AppLayout>
  )
}
