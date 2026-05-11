import { useCallback, useEffect, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { adaptProject, adaptRun } from '@/api/adapters.js'
import { createChart, listCharts } from '@/api/charts.js'
import { getProject } from '@/api/projects.js'
import { listRuns } from '@/api/runs.js'
import { useNotifications } from '@/app/useNotifications.js'
import { ChartBuilder } from '@/components/charts/ChartBuilder.jsx'
import { ErrorState } from '@/components/common/ErrorState.jsx'
import { LoadingState } from '@/components/common/LoadingState.jsx'
import { PageHeader } from '@/components/common/PageHeader.jsx'
import { AppLayout } from '@/components/layout/AppLayout.jsx'

export default function ChartsPage() {
  const { projectId } = useParams()
  const [project, setProject] = useState(null)
  const [runs, setRuns] = useState([])
  const [savedCharts, setSavedCharts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const { subscribe } = useNotifications()

  const loadChartsWorkspace = useCallback(async () => {
    setError('')
    try {
      const [projectResponse, runsResponse, chartsResponse] = await Promise.all([
        getProject(projectId),
        listRuns(projectId, { limit: 500 }),
        listCharts(projectId),
      ])
      setProject(adaptProject(projectResponse))
      setRuns((runsResponse.items || []).map((run) => adaptRun(run)))
      setSavedCharts(chartsResponse.items || [])
    } catch (err) {
      setError(err.message || 'Failed to load charts workspace.')
    } finally {
      setIsLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    loadChartsWorkspace()
  }, [loadChartsWorkspace])

  useEffect(() => subscribe((message) => {
    if (message.type === 'backend.connected' || message.project_id === projectId) loadChartsWorkspace()
  }), [loadChartsWorkspace, projectId, subscribe])

  async function handleSaveChart(body) {
    await createChart(projectId, body)
    await loadChartsWorkspace()
  }

  if (isLoading) {
    return (
      <AppLayout breadcrumbs={['MLWarden', 'Projects', 'Charts']}>
        <LoadingState message="Loading chart builder..." />
      </AppLayout>
    )
  }

  if (!project && error) {
    return (
      <AppLayout breadcrumbs={['MLWarden', 'Projects', 'Charts']}>
        <ErrorState message={error} />
      </AppLayout>
    )
  }

  if (!project) {
    return <Navigate to="/projects" replace />
  }

  return (
    <AppLayout breadcrumbs={['MLWarden', 'Projects', project.name, 'Charts']}>
      <PageHeader title="Charts" subtitle="Build saved project charts from metrics, params, metadata, tables, and events." />
      {error ? <ErrorState message={error} /> : null}
      <ChartBuilder project={project} runs={runs} savedCharts={savedCharts} onSaveChart={handleSaveChart} />
    </AppLayout>
  )
}
