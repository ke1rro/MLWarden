import { Navigate, useParams } from 'react-router-dom'
import { ChartBuilder } from '../components/charts/ChartBuilder.jsx'
import { PageHeader } from '../components/common/PageHeader.jsx'
import { AppLayout } from '../components/layout/AppLayout.jsx'
import { getProject, getRunsForProject, metricSeriesByRunId } from '../mockData.js'

export default function ChartsPage() {
  const { projectId } = useParams()
  const project = getProject(projectId)

  if (!project) {
    return <Navigate to="/projects" replace />
  }

  return (
    <AppLayout breadcrumbs={['MLWarden', 'Projects', project.name, 'Charts']}>
      <PageHeader title="Charts" subtitle="Build saved project charts from metrics, params, metadata, tables, and events." />
      <ChartBuilder project={project} runs={getRunsForProject(project.id)} metricSeries={metricSeriesByRunId} />
    </AppLayout>
  )
}
