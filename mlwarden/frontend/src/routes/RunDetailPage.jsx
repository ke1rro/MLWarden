import { Navigate, useParams, useSearchParams } from 'react-router-dom'
import { ArtifactList } from '@/components/artifacts/ArtifactList.jsx'
import { EmptyState } from '@/components/common/EmptyState.jsx'
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
import { useRunWorkspace } from '@/hooks/useRunWorkspace.js'

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
  const {
    artifacts,
    downloadRunArtifact,
    error,
    events,
    getRunImageUrl,
    images,
    isLoading,
    loadTableRows,
    logs,
    metricSeries,
    metricSummaries,
    project,
    run,
    tables,
    uploadRunArtifact,
    uploadRunImage,
  } = useRunWorkspace(runId)

  const activeTab = searchParams.get('tab') || 'charts'

  function renderTab() {
    if (activeTab === 'overview') return <RunOverview run={run} metricSummaries={metricSummaries} />
    if (activeTab === 'logs') return <LogViewer logs={logs} />
    if (activeTab === 'tables') return <DataTable tables={tables} loadTableRows={loadTableRows} />
    if (activeTab === 'images') return <ImageGallery getImageUrl={getRunImageUrl} images={images} onUpload={uploadRunImage} />
    if (activeTab === 'artifacts') return <ArtifactList artifacts={artifacts} onDownload={downloadRunArtifact} onUpload={uploadRunArtifact} />
    if (activeTab === 'events') return <EventTimeline events={events} />
    return <RunChartsWorkspace metricSeries={metricSeries} project={project} run={run} images={images} getImageUrl={getRunImageUrl} />
  }

  if (isLoading) {
    return (
      <AppLayout breadcrumbs={[{ label: 'MLWarden', to: '/workspace' }, { label: 'Runs', to: '/runs' }]}>
        <LoadingState message="Loading run..." />
      </AppLayout>
    )
  }

  if (!run && error) {
    return (
      <AppLayout breadcrumbs={[{ label: 'MLWarden', to: '/workspace' }, { label: 'Runs', to: '/runs' }]}>
        <EmptyState title="Run not found." message="Choose an existing run from the runs page or create one from a project workspace." />
      </AppLayout>
    )
  }

  if (!run || !project) {
    return <Navigate to="/projects" replace />
  }

  return (
    <AppLayout breadcrumbs={[{ label: 'MLWarden', to: '/workspace' }, { label: project.name, to: `/projects/${project.id}` }, { label: run.name }]}>
      <RunHeader project={project} run={run} />
      {error ? <ErrorState message={error.message || 'Failed to load run.'} /> : null}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={(tab) => setSearchParams(tab === 'charts' ? {} : { tab })} />
      {renderTab()}
    </AppLayout>
  )
}
