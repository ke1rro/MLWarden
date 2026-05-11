import { Navigate, useParams, useSearchParams } from 'react-router-dom'
import { ArtifactList } from '../components/artifacts/ArtifactList.jsx'
import { Tabs } from '../components/common/Tabs.jsx'
import { EventTimeline } from '../components/events/EventTimeline.jsx'
import { ImageGallery } from '../components/images/ImageGallery.jsx'
import { AppLayout } from '../components/layout/AppLayout.jsx'
import { LogViewer } from '../components/logs/LogViewer.jsx'
import { RunChartsWorkspace } from '../components/runs/RunChartsWorkspace.jsx'
import { RunHeader } from '../components/runs/RunHeader.jsx'
import { RunOverview } from '../components/runs/RunOverview.jsx'
import { DataTable } from '../components/tables/DataTable.jsx'
import {
  artifactsByRunId,
  eventsByRunId,
  getProject,
  getRun,
  imagesByRunId,
  logsByRunId,
  metricSeriesByRunId,
  tablesByRunId,
} from '../mockData.js'

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
  const run = getRun(runId)

  if (!run) {
    return <Navigate to="/projects" replace />
  }

  const project = getProject(run.projectId)
  const activeTab = searchParams.get('tab') || 'charts'
  const metricSeries = metricSeriesByRunId[run.id] || {}

  function renderTab() {
    if (activeTab === 'overview') return <RunOverview run={run} metricSeries={metricSeries} />
    if (activeTab === 'logs') return <LogViewer logs={logsByRunId[run.id] || []} />
    if (activeTab === 'tables') return <DataTable tables={tablesByRunId[run.id] || []} />
    if (activeTab === 'images') return <ImageGallery images={imagesByRunId[run.id] || []} />
    if (activeTab === 'artifacts') return <ArtifactList artifacts={artifactsByRunId[run.id] || []} />
    if (activeTab === 'events') return <EventTimeline events={eventsByRunId[run.id] || []} />
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
