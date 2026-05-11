import { useCallback, useEffect, useState } from 'react'
import { Navigate, useParams, useSearchParams } from 'react-router-dom'
import {
  adaptArtifact,
  adaptEvent,
  adaptImage,
  adaptLog,
  adaptMetricSummary,
  adaptParams,
  adaptProject,
  adaptRun,
  adaptTableMeta,
  adaptTableRows,
} from '@/api/adapters.js'
import { downloadArtifact, listArtifacts, uploadArtifact } from '@/api/artifacts.js'
import { listRunEvents } from '@/api/events.js'
import { getImageFileUrl, listImages, uploadImage } from '@/api/images.js'
import { getLogs } from '@/api/logs.js'
import { getMetricSummary, getMetrics } from '@/api/metrics.js'
import { getParams } from '@/api/params.js'
import { getProject } from '@/api/projects.js'
import { cancelRun, failRun, finishRun, getRun, startRun } from '@/api/runs.js'
import { getTable, listTables } from '@/api/tables.js'
import { useNotifications } from '@/app/useNotifications.js'
import { ArtifactList } from '@/components/artifacts/ArtifactList.jsx'
import { ErrorState } from '@/components/common/ErrorState.jsx'
import { LoadingState } from '@/components/common/LoadingState.jsx'
import { Tabs } from '@/components/common/Tabs.jsx'
import { EventTimeline } from '@/components/events/EventTimeline.jsx'
import { ImageGallery } from '@/components/images/ImageGallery.jsx'
import { AppLayout } from '@/components/layout/AppLayout.jsx'
import { LogViewer } from '@/components/logs/LogViewer.jsx'
import { RunChartsWorkspace } from '@/components/runs/RunChartsWorkspace.jsx'
import { RunHeader } from '@/components/runs/RunHeader.jsx'
import { RunOverview } from '@/components/runs/RunOverview.jsx'
import { DataTable } from '@/components/tables/DataTable.jsx'

const tabs = [
  { id: 'charts', label: 'Charts' },
  { id: 'overview', label: 'Overview' },
  { id: 'logs', label: 'Logs' },
  { id: 'tables', label: 'Tables' },
  { id: 'images', label: 'Images' },
  { id: 'artifacts', label: 'Artifacts' },
  { id: 'events', label: 'Events' },
]

export default function RunDetailPage() {
  const { runId } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const [project, setProject] = useState(null)
  const [run, setRun] = useState(null)
  const [metricSeries, setMetricSeries] = useState({})
  const [metricSummaries, setMetricSummaries] = useState([])
  const [logs, setLogs] = useState([])
  const [tables, setTables] = useState([])
  const [images, setImages] = useState([])
  const [artifacts, setArtifacts] = useState([])
  const [events, setEvents] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const { subscribe } = useNotifications()

  const loadRunWorkspace = useCallback(async () => {
    setError('')
    try {
      const runResponse = await getRun(runId)
      const [
        projectResponse,
        paramsResponse,
        summaryResponse,
        logsResponse,
        tablesResponse,
        imagesResponse,
        artifactsResponse,
        eventsResponse,
      ] = await Promise.all([
        getProject(runResponse.project_id),
        getParams(runId),
        getMetricSummary(runId),
        getLogs(runId, { limit: 500 }),
        listTables(runId),
        listImages(runId, { limit: 500 }),
        listArtifacts(runId, { limit: 500 }),
        listRunEvents(runId, { limit: 500 }),
      ])

      const params = adaptParams(paramsResponse)
      const summaries = adaptMetricSummary(summaryResponse.items || [])
      const names = summaries.map((summary) => summary.name)
      const metricsResponse = names.length ? await getMetrics(runId, names) : { series: {} }

      setProject(adaptProject(projectResponse))
      setRun(adaptRun(runResponse, params))
      setMetricSummaries(summaries)
      setMetricSeries(metricsResponse.series || {})
      setLogs((logsResponse.items || []).map(adaptLog))
      setTables((tablesResponse.items || []).map(adaptTableMeta))
      setImages((imagesResponse.items || []).map(adaptImage))
      setArtifacts((artifactsResponse.items || []).map(adaptArtifact))
      setEvents((eventsResponse.items || []).map(adaptEvent))
    } catch (err) {
      setError(err.message || 'Failed to load run.')
    } finally {
      setIsLoading(false)
    }
  }, [runId])

  const activeTab = searchParams.get('tab') || 'charts'

  useEffect(() => {
    loadRunWorkspace()
  }, [loadRunWorkspace])

  useEffect(() => subscribe((message) => {
    if (message.type === 'backend.connected' || message.run_id === runId) {
      loadRunWorkspace()
    }
  }), [loadRunWorkspace, runId, subscribe])

  async function handleRunAction(action) {
    setError('')
    try {
      if (action === 'start') await startRun(runId)
      if (action === 'finish') await finishRun(runId)
      if (action === 'fail') await failRun(runId, { error_message: 'Marked failed from UI' })
      if (action === 'cancel') await cancelRun(runId)
      await loadRunWorkspace()
    } catch (err) {
      setError(err.message || 'Run action failed.')
    }
  }

  const loadTableRows = useCallback(async (tableName, params) => {
    const response = await getTable(runId, tableName, params)
    return {
      rows: adaptTableRows(response.rows || response.items || []),
      total: response.total || 0,
    }
  }, [runId])

  async function handleImageUpload(payload) {
    await uploadImage(runId, payload)
    await loadRunWorkspace()
  }

  async function handleArtifactUpload(payload) {
    await uploadArtifact(runId, payload)
    await loadRunWorkspace()
  }

  async function handleArtifactDownload(artifact) {
    await downloadArtifact(artifact.id, artifact.original_filename || artifact.name)
  }

  function renderTab() {
    if (activeTab === 'overview') return <RunOverview run={run} metricSummaries={metricSummaries} />
    if (activeTab === 'logs') return <LogViewer logs={logs} />
    if (activeTab === 'tables') return <DataTable tables={tables} loadTableRows={loadTableRows} />
    if (activeTab === 'images') return <ImageGallery getImageUrl={getImageFileUrl} images={images} onUpload={handleImageUpload} />
    if (activeTab === 'artifacts') return <ArtifactList artifacts={artifacts} onDownload={handleArtifactDownload} onUpload={handleArtifactUpload} />
    if (activeTab === 'events') return <EventTimeline events={events} />
    return <RunChartsWorkspace metricSeries={metricSeries} />
  }

  if (isLoading) {
    return (
      <AppLayout breadcrumbs={['MLWarden', 'Runs']}>
        <LoadingState message="Loading run..." />
      </AppLayout>
    )
  }

  if (!run && error) {
    return (
      <AppLayout breadcrumbs={['MLWarden', 'Runs']}>
        <ErrorState message={error} />
      </AppLayout>
    )
  }

  if (!run || !project) {
    return <Navigate to="/projects" replace />
  }

  return (
    <AppLayout breadcrumbs={['MLWarden', 'Projects', project.name, 'Runs', run.name]}>
      <RunHeader onRunAction={handleRunAction} project={project} run={run} />
      {error ? <ErrorState message={error} /> : null}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={(tab) => setSearchParams(tab === 'charts' ? {} : { tab })} />
      {renderTab()}
    </AppLayout>
  )
}
