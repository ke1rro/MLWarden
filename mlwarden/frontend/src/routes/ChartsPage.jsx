import { useParams, useSearchParams } from 'react-router-dom'
import { ChartBuilder } from '@/components/charts/ChartBuilder.jsx'
import { ErrorState } from '@/components/common/ErrorState.jsx'
import { LoadingState } from '@/components/common/LoadingState.jsx'
import { AppLayout } from '@/components/layout/AppLayout.jsx'
import { useChartsPageWorkspace } from '@/hooks/useChartsPageWorkspace.js'

export default function ChartsPage() {
  const { projectId: routeProjectId } = useParams()
  const [searchParams] = useSearchParams()
  const initialChartId = searchParams.get('chart') || null
  const workspace = useChartsPageWorkspace({ initialChartId, routeProjectId })

  return (
    <AppLayout
      breadcrumbs={workspace.breadcrumbs}
      title="Charts"
      subtitle="Build saved project charts from run metrics."
    >
      {workspace.error ? <ErrorState message={workspace.error} /> : null}
      {workspace.isLoading
        ? <LoadingState message="Loading workspace..." />
        : (
          <ChartBuilder
            availableProjects={workspace.availableProjects}
            initialChart={workspace.initialChart}
            loadMetricSeries={workspace.loadMetricSeries}
            onDeleteChart={workspace.deleteChart}
            onProjectChange={workspace.handleProjectChange}
            onSaveChart={workspace.projectId ? workspace.saveChart : null}
            project={workspace.project}
            runs={workspace.runs}
            savedCharts={workspace.savedCharts}
          />
        )}
    </AppLayout>
  )
}
