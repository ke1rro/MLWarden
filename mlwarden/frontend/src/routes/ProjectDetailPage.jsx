import { ExternalLink as ExternalLinkIcon, Trash2 as Trash2Icon } from 'lucide-react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { ConfirmDialog } from '@/components/common/ConfirmDialog.jsx'
import { ErrorState } from '@/components/common/ErrorState.jsx'
import { LoadingState } from '@/components/common/LoadingState.jsx'
import { MetricCard } from '@/components/common/MetricCard.jsx'
import { AppLayout } from '@/components/layout/AppLayout.jsx'
import { ProjectRunsWorkspace } from '@/components/projects/ProjectRunsWorkspace.jsx'
import { RunComparisonWorkspace } from '@/components/runs/RunComparisonWorkspace.jsx'
import { MetricChart } from '@/components/charts/MetricChart.jsx'
import { PanelCard } from '@/components/charts/PanelCard.jsx'
import { buildChartOption, normalizeChartConfig } from '@/components/charts/chartOptions.js'
import { useProjectDetailWorkspace } from '@/hooks/useProjectDetailWorkspace.js'

function ProjectTags({ tags }) {
  return (
    <div className="tag-row">
      {tags.map((item) => <span className="tag" key={item}>{item}</span>)}
    </div>
  )
}

function ProjectMetricSummary({ stats }) {
  return (
    <div className="metric-grid">
      <MetricCard label="Runs" value={stats.runs} detail="total" />
      <MetricCard label="Running" value={stats.running} detail="active workers" />
      <MetricCard label="Finished" value={stats.finished} detail="completed" />
      <MetricCard label="Failed" value={stats.failed} detail="needs review" />
    </div>
  )
}

function SavedChartPanel({ chart, previewSeries, actions = [] }) {
  const config = normalizeChartConfig({ ...chart.config, name: chart.name, chartType: chart.chart_type || chart.type })
  const metric = config.metric || config.yAxis || chart.name
  const option = buildChartOption({ ...config, showTitle: false }, previewSeries[metric])

  return (
    <PanelCard actions={actions} title={chart.name}>
      <MetricChart option={option} />
    </PanelCard>
  )
}

function SavedChartsSection({ project, savedCharts, previewSeries, onDeleteChart }) {
  return (
    <section className="saved-charts">
      <header className="section-header">
        <div>
          <h2>Saved charts</h2>
          <p>Project-level chart configurations with preview data from the latest run.</p>
        </div>
        <Link className="button button-secondary button-md" to={`/projects/${project.id}/charts`}>New chart</Link>
      </header>
      <div className="chart-grid compact-grid">
        {savedCharts.map((chart) => (
          <div data-search-text={`${chart.name} ${project.name}`} key={chart.id}>
            <SavedChartPanel
              actions={onDeleteChart ? [
                { label: 'Open in builder', icon: ExternalLinkIcon, onSelect: () => window.location.assign(`/projects/${project.id}/charts?chart=${chart.id}`) },
                { label: 'Delete chart', icon: Trash2Icon, onSelect: () => onDeleteChart(chart) },
              ] : []}
              chart={chart}
              previewSeries={previewSeries}
            />
          </div>
        ))}
      </div>
    </section>
  )
}

function ProjectDetailDialogs({ workspace }) {
  return (
    <>
      {workspace.deleteRunTarget ? (
        <ConfirmDialog
          title={`Delete "${workspace.deleteRunTarget.name}"?`}
          message="This will permanently remove the run and its data. This action cannot be undone."
          confirmLabel={workspace.isDeletingRun ? 'Deleting...' : 'Delete'}
          cancelLabel="Cancel"
          onCancel={() => workspace.setDeleteRunTarget(null)}
          onConfirm={workspace.confirmDeleteRun}
        />
      ) : null}
      {workspace.deleteChartTarget ? (
        <ConfirmDialog
          title={`Delete chart "${workspace.deleteChartTarget.name}"?`}
          message="This will permanently remove the saved chart configuration. This action cannot be undone."
          confirmLabel={workspace.isDeletingChart ? 'Deleting...' : 'Delete'}
          cancelLabel="Cancel"
          onCancel={() => workspace.setDeleteChartTarget(null)}
          onConfirm={workspace.confirmDeleteChart}
        />
      ) : null}
    </>
  )
}

export default function ProjectDetailPage() {
  const { projectId } = useParams()
  const workspace = useProjectDetailWorkspace(projectId)

  if (workspace.isLoading) {
    return (
      <AppLayout breadcrumbs={['MLWarden', 'Projects']}>
        <LoadingState message="Loading project..." />
      </AppLayout>
    )
  }

  if (!workspace.project && workspace.error) {
    return (
      <AppLayout breadcrumbs={[{ label: 'MLWarden', to: '/workspace' }, { label: 'Projects', to: '/projects' }]}>
        <ErrorState title="Project not available" message={workspace.error} />
      </AppLayout>
    )
  }

  if (!workspace.project) {
    return <Navigate to="/projects" replace />
  }

  const { project } = workspace

  return (
    <AppLayout
      actions={<Link className="button button-secondary button-md" to={`/projects/${project.id}/charts`}>Open charts</Link>}
      breadcrumbs={[{ label: 'MLWarden', to: '/workspace' }, { label: project.name }]}
      title={project.name}
      subtitle={project.description}
    >
      {workspace.error ? <ErrorState message={workspace.error} /> : null}
      {!workspace.isComparisonActive ? <ProjectTags tags={project.tags} /> : null}
      {!workspace.isComparisonActive ? <ProjectMetricSummary stats={workspace.projectStats} /> : null}
      {workspace.isComparisonActive ? (
        <RunComparisonWorkspace
          activeComparison={workspace.activeComparison}
          onApplyComparison={workspace.applyComparison}
          onReset={workspace.resetComparison}
          onSaved={workspace.loadProjectWorkspace}
          project={project}
          savedComparisons={workspace.savedComparisons}
          selectedRunIds={workspace.selectedRunIds}
          sharedMetrics={workspace.sharedMetrics}
        />
      ) : (
        <>
          <ProjectRunsWorkspace
            disabledRunIds={workspace.disabledRunIds}
            onDeleteRun={workspace.setDeleteRunTarget}
            query={workspace.query}
            runColorMap={workspace.runColorMap}
            runs={workspace.filteredRuns}
            selectedRunIds={workspace.selectedRunIds}
            onQueryChange={workspace.setQuery}
            onResetComparison={workspace.resetComparison}
            onRunSelect={workspace.selectRun}
            onStartComparison={() => workspace.setIsComparisonActive(true)}
            onStatusChange={workspace.setStatus}
            status={workspace.status}
          />
          <SavedChartsSection
            onDeleteChart={workspace.setDeleteChartTarget}
            previewSeries={workspace.previewSeries}
            project={project}
            savedCharts={workspace.savedCharts}
          />
        </>
      )}
      <ProjectDetailDialogs workspace={workspace} />
    </AppLayout>
  )
}
