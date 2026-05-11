import { Navigate, useParams, useSearchParams } from 'react-router-dom'
import { ArtifactList } from '@/components/artifacts/ArtifactList.jsx'
import { Tabs } from '@/components/common/Tabs.jsx'
import { EventTimeline } from '@/components/events/EventTimeline.jsx'
import { ImageGallery } from '@/components/images/ImageGallery.jsx'
import { AppLayout } from '@/components/layout/AppLayout.jsx'
import { LogViewer } from '@/components/logs/LogViewer.jsx'
import { RunChartsWorkspace } from '@/components/runs/RunChartsWorkspace.jsx'
import { RunHeader } from '@/components/runs/RunHeader.jsx'
import { RunOverview } from '@/components/runs/RunOverview.jsx'
import { DataTable } from '@/components/tables/DataTable.jsx'
import { trackerApi } from '@/api/TrackerApi.js'

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
  const workspace = trackerApi.getRunWorkspace(runId)

  if (!workspace) {
    return <Navigate to="/projects" replace />
  }

  const { artifacts, events, images, logs, metricSeries, project, run, tables } = workspace
  const activeTab = searchParams.get('tab') || 'charts'

  function renderTab() {
    if (activeTab === 'overview') return <RunOverview run={run} metricSeries={metricSeries} />
    if (activeTab === 'logs') return <LogViewer logs={logs} />
    if (activeTab === 'tables') return <DataTable tables={tables} />
    if (activeTab === 'images') return <ImageGallery images={images} />
    if (activeTab === 'artifacts') return <ArtifactList artifacts={artifacts} />
    if (activeTab === 'events') return <EventTimeline events={events} />
    return <RunChartsWorkspace metricSeries={metricSeries} />
  }

  return (
    <AppLayout breadcrumbs={['MLWarden', 'Projects', project.name, 'Runs', run.name]}>
      <RunHeader project={project} run={run} />
      <Tabs tabs={tabs} activeTab={activeTab} onChange={(tab) => setSearchParams(tab === 'charts' ? {} : { tab })} />
      {renderTab()}
    </AppLayout>
  )
}
