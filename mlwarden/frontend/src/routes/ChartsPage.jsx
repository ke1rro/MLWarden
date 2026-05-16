import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { adaptProject, adaptRun } from '@/api/adapters.js'
import { createChart, listCharts, updateChart } from '@/api/charts.js'
import { getProject } from '@/api/projects.js'
import { listRuns } from '@/api/runs.js'
import { useNotifications } from '@/app/useNotifications.js'
import { ChartBuilder } from '@/components/charts/ChartBuilder.jsx'
import { ErrorState } from '@/components/common/ErrorState.jsx'
import { LoadingState } from '@/components/common/LoadingState.jsx'
import { PageHeader } from '@/components/common/PageHeader.jsx'
import { AppLayout } from '@/components/layout/AppLayout.jsx'

export default function ChartsPage() {
  const { projectId: routeProjectId } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const initialChartId = searchParams.get('chart') || null

  const [projectId, setProjectId] = useState(routeProjectId || null)
  const [project, setProject] = useState(null)
  const [runs, setRuns] = useState([])
  const [savedCharts, setSavedCharts] = useState([])
  const [isLoading, setIsLoading] = useState(!!routeProjectId)
  const [error, setError] = useState('')
  const { subscribe } = useNotifications()

  const loadWorkspace = useCallback(async (pid) => {
    if (!pid) return
    setIsLoading(true)
    setError('')
    try {
      const [projectRes, runsRes, chartsRes] = await Promise.all([
        getProject(pid),
        listRuns(pid, { limit: 500 }),
        listCharts(pid),
      ])
      setProject(adaptProject(projectRes))
      setRuns((runsRes.items || []).map((r) => adaptRun(r)))
      setSavedCharts(chartsRes.items || [])
    } catch (err) {
      setError(err.message || 'Failed to load workspace.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadWorkspace(projectId)
  }, [projectId, loadWorkspace])

  useEffect(() => subscribe((msg) => {
    if (msg.type === 'backend.connected' || msg.project_id === projectId) loadWorkspace(projectId)
  }), [loadWorkspace, projectId, subscribe])

  function handleProjectChange(nextProjectId) {
    if (nextProjectId === projectId) return
    setProject(null)
    setRuns([])
    setSavedCharts([])
    setIsLoading(true)
    setProjectId(nextProjectId)
    navigate(`/projects/${nextProjectId}/charts`, { replace: true })
  }

  async function handleSaveChart(body, chartId) {
    if (chartId) {
      await updateChart(chartId, body)
    } else {
      await createChart(projectId, body)
    }
    await loadWorkspace(projectId)
  }

  const initialChart = initialChartId ? savedCharts.find((c) => c.id === initialChartId) : null

  const breadcrumbs = [
    { label: 'MLWarden', to: '/workspace' },
    ...(project ? [{ label: project.name, to: `/projects/${project.id}` }] : []),
    { label: 'Charts' },
  ]

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <PageHeader title="Charts" subtitle="Build saved project charts from run metrics." />
      {error ? <ErrorState message={error} /> : null}
      {isLoading
        ? <LoadingState message="Loading workspace..." />
        : (
          <ChartBuilder
            project={project}
            runs={runs}
            savedCharts={savedCharts}
            onSaveChart={projectId ? handleSaveChart : null}
            onProjectChange={handleProjectChange}
            initialChart={initialChart}
          />
        )}
    </AppLayout>
  )
}
