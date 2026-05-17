import { ExternalLink as ExternalLinkIcon, Trash2 as Trash2Icon } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom'
import { adaptProject, adaptRun } from '@/api/adapters.js'
import { deleteChart, listCharts } from '@/api/charts.js'
import { getMetricSummary, getMetrics } from '@/api/metrics.js'
import { getProject } from '@/api/projects.js'
import { listRunComparisons } from '@/api/runComparisons.js'
import { deleteRun, listRuns } from '@/api/runs.js'
import { useNotifications } from '@/app/useNotifications.js'
import { ConfirmDialog } from '@/components/common/ConfirmDialog.jsx'
import { ErrorState } from '@/components/common/ErrorState.jsx'
import { LoadingState } from '@/components/common/LoadingState.jsx'
import { MetricCard } from '@/components/common/MetricCard.jsx'
import { PageHeader } from '@/components/common/PageHeader.jsx'
import { AppLayout } from '@/components/layout/AppLayout.jsx'
import { ProjectRunsWorkspace } from '@/components/projects/ProjectRunsWorkspace.jsx'
import { RunComparisonWorkspace } from '@/components/runs/RunComparisonWorkspace.jsx'
import { MetricChart } from '@/components/charts/MetricChart.jsx'
import { PanelCard } from '@/components/charts/PanelCard.jsx'
import { buildChartOption, normalizeChartConfig } from '@/components/charts/chartOptions.js'

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

function SavedChartPanel({ chart, previewSeries, actions = [] }) {
  const config = normalizeChartConfig({ ...chart.config, name: chart.name, chartType: chart.chart_type || chart.type })
  const metric = config.metric || config.yAxis || chart.name
  const option = buildChartOption({ ...config, showTitle: false }, previewSeries[metric])

  return (
    <PanelCard actions={actions} title={chart.name}>
      <MetricChart option={option} />
    </PanelCard>
  )
}

function SavedChartsSection({ project, savedCharts, previewSeries, onDeleteChart }) {
  return (
    <section className="saved-charts">
      <header className="section-header">
        <div>
          <h2>Saved charts</h2>
          <p>Project-level chart configurations with preview data from the latest run.</p>
        </div>
        <Link className="button button-secondary button-md" to={`/projects/${project.id}/charts`}>New chart</Link>
      </header>
      <div className="chart-grid compact-grid">
        {savedCharts.map((chart) => (
          <div data-search-text={`${chart.name} ${project.name}`} key={chart.id}>
            <SavedChartPanel
              actions={onDeleteChart ? [
                { label: 'Open in builder', icon: ExternalLinkIcon, onSelect: () => window.location.assign(`/projects/${project.id}/charts?chart=${chart.id}`) },
                { label: 'Delete chart', icon: Trash2Icon, onSelect: () => onDeleteChart(chart) },
              ] : []}
              chart={chart}
              previewSeries={previewSeries}
            />
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
  const [selectedRunIds, setSelectedRunIds] = useState(initialSelectedRunIds)
  const [isComparisonActive, setIsComparisonActive] = useState(initialSelectedRunIds.length >= 2)
  const [activeComparison, setActiveComparison] = useState(null)
  const [deleteChartTarget, setDeleteChartTarget] = useState(null)
  const [isDeletingChart, setIsDeletingChart] = useState(false)
  const [deleteRunTarget, setDeleteRunTarget] = useState(null)
  const [isDeletingRun, setIsDeletingRun] = useState(false)
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

  async function handleConfirmDeleteRun() {
    setIsDeletingRun(true)
    setError('')
    try {
      await deleteRun(deleteRunTarget.id)
      setDeleteRunTarget(null)
      await loadProjectWorkspace()
    } catch (err) {
      setError(err.message || 'Failed to delete run.')
    } finally {
      setIsDeletingRun(false)
    }
  }

  async function handleConfirmDeleteChart() {
    setIsDeletingChart(true)
    setError('')
    try {
      await deleteChart(deleteChartTarget.id)
      setDeleteChartTarget(null)
      await loadProjectWorkspace()
    } catch (err) {
      setError(err.message || 'Failed to delete chart.')
    } finally {
      setIsDeletingChart(false)
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
          <Link className="button button-secondary button-md" to={`/projects/${project.id}/charts`}>Open charts</Link>
        )}
      />
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
          <ProjectRunsWorkspace
            disabledRunIds={disabledRunIds}
            onDeleteRun={(run) => setDeleteRunTarget(run)}
            query={query}
            runColorMap={runColorMap}
            runs={filteredRuns}
            selectedRunIds={selectedRunIds}
            onQueryChange={setQuery}
            onResetComparison={handleResetComparison}
            onRunSelect={handleRunSelect}
            onStartComparison={() => setIsComparisonActive(true)}
            onStatusChange={setStatus}
            status={status}
          />
          <SavedChartsSection
            onDeleteChart={(chart) => setDeleteChartTarget(chart)}
            previewSeries={previewSeries}
            project={project}
            savedCharts={savedCharts}
          />
        </>
      )}
      {deleteRunTarget ? (
        <ConfirmDialog
          title={`Delete "${deleteRunTarget.name}"?`}
          message="This will permanently remove the run and its data. This action cannot be undone."
          confirmLabel={isDeletingRun ? 'Deleting...' : 'Delete'}
          cancelLabel="Cancel"
          onCancel={() => setDeleteRunTarget(null)}
          onConfirm={handleConfirmDeleteRun}
        />
      ) : null}
      {deleteChartTarget ? (
        <ConfirmDialog
          title={`Delete chart "${deleteChartTarget.name}"?`}
          message="This will permanently remove the saved chart configuration. This action cannot be undone."
          confirmLabel={isDeletingChart ? 'Deleting...' : 'Delete'}
          cancelLabel="Cancel"
          onCancel={() => setDeleteChartTarget(null)}
          onConfirm={handleConfirmDeleteChart}
        />
      ) : null}
    </AppLayout>
  )
}
