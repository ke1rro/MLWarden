import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { adaptProject, adaptRun } from '@/api/adapters.js'
import { chartsApi } from '@/api/charts.js'
import { metricsApi } from '@/api/metrics.js'
import { projectsApi } from '@/api/projects.js'
import { runsApi } from '@/api/runs.js'
import { useNotifications } from '@/app/useNotifications.js'

export function useChartsPageWorkspace({ initialChartId, routeProjectId }) {
  const navigate = useNavigate()
  const [projectId, setProjectId] = useState(routeProjectId || null)
  const [project, setProject] = useState(null)
  const [runs, setRuns] = useState([])
  const [savedCharts, setSavedCharts] = useState([])
  const [availableProjects, setAvailableProjects] = useState([])
  const [isLoading, setIsLoading] = useState(!!routeProjectId)
  const [error, setError] = useState('')
  const { subscribe } = useNotifications()

  const loadProjectWorkspace = useCallback(async (pid, { silent = false } = {}) => {
    if (!pid) return
    if (!silent) setIsLoading(true)
    setError('')
    try {
      const [projectRes, runsRes, chartsRes] = await Promise.all([
        projectsApi.get(pid),
        runsApi.list(pid, { limit: 500 }),
        chartsApi.list(pid),
      ])
      setProject(adaptProject(projectRes))
      setRuns((runsRes.items || []).map((run) => adaptRun(run)))
      setSavedCharts(chartsRes.items || [])
    } catch (err) {
      setError(err.message || 'Failed to load workspace.')
    } finally {
      if (!silent) setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    projectsApi.list()
      .then((response) => {
        if (!cancelled) setAvailableProjects((response.items || []).map(adaptProject))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    loadProjectWorkspace(projectId)
  }, [projectId, loadProjectWorkspace])

  useEffect(() => subscribe((msg) => {
    if (msg.type === 'backend.connected' || msg.project_id === projectId) loadProjectWorkspace(projectId)
  }), [loadProjectWorkspace, projectId, subscribe])

  function handleProjectChange(nextProjectId) {
    if (nextProjectId === projectId) return
    setProject(null)
    setRuns([])
    setSavedCharts([])
    setIsLoading(true)
    setProjectId(nextProjectId)
    navigate(`/projects/${nextProjectId}/charts`, { replace: true })
  }

  async function saveChart(body, chartId) {
    if (chartId) {
      await chartsApi.update(chartId, body)
      await loadProjectWorkspace(projectId, { silent: true })
    } else {
      const newChart = await chartsApi.create(projectId, body)
      navigate(`/projects/${projectId}/charts?chart=${newChart.id}`, { replace: true })
      await loadProjectWorkspace(projectId, { silent: true })
    }
  }

  async function deleteChart(chartId) {
    await chartsApi.delete(chartId)
    navigate('/charts', { replace: true })
    await loadProjectWorkspace(projectId, { silent: true })
  }

  async function loadMetricSeries(runId) {
    const summary = await metricsApi.summary(runId)
    const names = (summary.items || []).map((item) => item.name)
    const response = names.length ? await metricsApi.get(runId, names) : { series: {} }
    return response.series || {}
  }

  return {
    availableProjects,
    breadcrumbs: [
      { label: 'MLWarden', to: '/workspace' },
      ...(project ? [{ label: project.name, to: `/projects/${project.id}` }] : []),
      { label: 'Charts' },
    ],
    error,
    initialChart: initialChartId ? savedCharts.find((chart) => chart.id === initialChartId) : null,
    isLoading,
    project,
    projectId,
    runs,
    savedCharts,
    deleteChart,
    handleProjectChange,
    loadMetricSeries,
    saveChart,
  }
}
