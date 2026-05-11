import { Navigate, useParams } from 'react-router-dom'
import { ChartBuilder } from '@/components/charts/ChartBuilder.jsx'
import { PageHeader } from '@/components/common/PageHeader.jsx'
import { AppLayout } from '@/components/layout/AppLayout.jsx'
import { trackerApi } from '@/api/TrackerApi.js'

export default function ChartsPage() {
  const { projectId } = useParams()
  const workspace = trackerApi.getChartsWorkspace(projectId)

  if (!workspace) {
    return <Navigate to="/projects" replace />
  }

  const { project, runs, metricSeries } = workspace

  return (
    <AppLayout breadcrumbs={['MLWarden', 'Projects', project.name, 'Charts']}>
      <PageHeader title="Charts" subtitle="Build saved project charts from metrics, params, metadata, tables, and events." />
      <ChartBuilder project={project} runs={runs} metricSeries={metricSeries} />
    </AppLayout>
  )
}
