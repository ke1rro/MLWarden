import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { adaptProject, adaptRun } from '@/api/adapters.js'
import { chartsApi } from '@/api/charts.js'
import { metricsApi } from '@/api/metrics.js'
import { projectsApi } from '@/api/projects.js'
import { runComparisonsApi } from '@/api/runComparisons.js'
import { runsApi } from '@/api/runs.js'
import { useNotifications } from '@/app/useNotifications.js'

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

function initialRunSelection(searchParams) {
  return (searchParams.get('runs') || '').split(',').map((item) => item.trim()).filter(Boolean)
}

export function useProjectDetailWorkspace(projectId) {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialSelectedRunIds = useMemo(() => initialRunSelection(searchParams), [searchParams])
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
        projectsApi.get(projectId),
        runsApi.list(projectId, { limit: 500 }),
        chartsApi.list(projectId),
        runComparisonsApi.list(projectId),
      ])
      const nextProject = adaptProject(projectResponse)
      const nextRuns = (runsResponse.items || []).map((run) => adaptRun(run))
      setProject(nextProject)
      setProjectRuns(nextRuns)
      setSavedCharts(chartsResponse.items || [])
      setSavedComparisons(comparisonsResponse.items || [])

      const metricEntries = await Promise.all(nextRuns.map(async (run) => {
        try {
          const summary = await metricsApi.summary(run.id)
          return [run.id, (summary.items || []).map((item) => item.name)]
        } catch {
          return [run.id, []]
        }
      }))
      const metricNameMap = Object.fromEntries(metricEntries)
      setRunMetricNames(metricNameMap)

      if (nextRuns[0]) {
        const names = metricNameMap[nextRuns[0].id] || []
        const metrics = names.length ? await metricsApi.get(nextRuns[0].id, names) : { series: {} }
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
  const filteredRuns = useMemo(() => projectRuns.filter((run) => {
    const matchesStatus = status === 'all' || run.status === status
    const matchesQuery = `${run.name} ${run.description} ${run.worker}`.toLowerCase().includes(query.toLowerCase())
    return matchesStatus && matchesQuery
  }), [projectRuns, query, status])

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

  function resetComparison() {
    setActiveComparison(null)
    setIsComparisonActive(false)
    updateSelectedRunIds([])
  }

  function applyComparison(comparison) {
    setActiveComparison(comparison)
    updateSelectedRunIds(comparison.run_ids || [])
    setIsComparisonActive(true)
  }

  async function confirmDeleteRun() {
    setIsDeletingRun(true)
    setError('')
    try {
      await runsApi.delete(deleteRunTarget.id)
      setDeleteRunTarget(null)
      await loadProjectWorkspace()
    } catch (err) {
      setError(err.message || 'Failed to delete run.')
    } finally {
      setIsDeletingRun(false)
    }
  }

  async function confirmDeleteChart() {
    setIsDeletingChart(true)
    setError('')
    try {
      await chartsApi.delete(deleteChartTarget.id)
      setDeleteChartTarget(null)
      await loadProjectWorkspace()
    } catch (err) {
      setError(err.message || 'Failed to delete chart.')
    } finally {
      setIsDeletingChart(false)
    }
  }

  return {
    activeComparison,
    deleteChartTarget,
    deleteRunTarget,
    disabledRunIds,
    error,
    filteredRuns,
    isComparisonActive,
    isDeletingChart,
    isDeletingRun,
    isLoading,
    previewSeries,
    project,
    projectStats,
    query,
    runColorMap,
    savedCharts,
    savedComparisons,
    selectedRunIds,
    sharedMetrics,
    status,
    applyComparison,
    confirmDeleteChart,
    confirmDeleteRun,
    loadProjectWorkspace,
    resetComparison,
    setDeleteChartTarget,
    setDeleteRunTarget,
    setIsComparisonActive,
    setQuery,
    setStatus,
    selectRun: handleRunSelect,
  }
}
