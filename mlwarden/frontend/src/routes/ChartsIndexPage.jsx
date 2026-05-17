import { LineChart, Plus, ExternalLink, Trash2 } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { ActionMenu } from '@/components/common/ActionMenu.jsx'
import { ConfirmDialog } from '@/components/common/ConfirmDialog.jsx'
import { ErrorState } from '@/components/common/ErrorState.jsx'
import { LoadingState } from '@/components/common/LoadingState.jsx'
import { SearchInput } from '@/components/common/SearchInput.jsx'
import { Toolbar } from '@/components/common/Toolbar.jsx'
import { AppLayout } from '@/components/layout/AppLayout.jsx'
import { useChartsIndexWorkspace } from '@/hooks/useChartsIndexWorkspace.js'

function NewChartCard() {
  return (
    <Link className="summary-card summary-card-new" to="/charts/new">
      <Plus size={18} />
      <strong>New chart</strong>
      <span>Visualize run metrics</span>
    </Link>
  )
}

function ChartIndexCard({ chart, onDelete, onOpen }) {
  return (
    <div
      className="summary-card summary-card-with-actions"
      data-search-text={`${chart.name} ${chart.projectName} ${chart.chart_type}`}
    >
      <button
        className="summary-card-body"
        onClick={onOpen}
        type="button"
      >
        <LineChart size={18} />
        <strong>{chart.name}</strong>
        <span>{chart.projectName} · {chart.chart_type ? `${chart.chart_type} chart` : (chart.type ? `${chart.type} chart` : 'chart')}</span>
      </button>
      <div className="summary-card-menu">
        <ActionMenu items={[
          {
            label: 'View chart',
            icon: ExternalLink,
            onSelect: onOpen,
          },
          {
            label: 'Delete chart',
            icon: Trash2,
            onSelect: onDelete,
          },
        ]} />
      </div>
    </div>
  )
}

function ChartIndexGrid({ charts, onDelete, onOpen }) {
  return (
    <div className="card-grid">
      <NewChartCard />
      {charts.map((chart) => (
        <ChartIndexCard
          chart={chart}
          key={chart.id}
          onDelete={() => onDelete(chart)}
          onOpen={() => onOpen(chart)}
        />
      ))}
    </div>
  )
}

export default function ChartsIndexPage() {
  const navigate = useNavigate()
  const workspace = useChartsIndexWorkspace()

  return (
    <AppLayout
      breadcrumbs={[{ label: 'MLWarden', to: '/workspace' }, { label: 'Charts' }]}
      title="Charts"
      subtitle="Saved metric views."
    >
      <Toolbar>
        <SearchInput value={workspace.query} onChange={workspace.setQuery} placeholder="Search charts" />
      </Toolbar>
      {workspace.isLoading ? <LoadingState message="Loading charts..." /> : null}
      {workspace.error ? <ErrorState message={workspace.error} /> : null}
      {!workspace.isLoading && !workspace.error ? (
        <ChartIndexGrid
          charts={workspace.filteredCharts}
          onDelete={workspace.setDeleteTarget}
          onOpen={(chart) => navigate(`/projects/${chart.projectId}/charts?chart=${chart.id}`)}
        />
      ) : null}
      {workspace.deleteTarget ? (
        <ConfirmDialog
          title={`Delete "${workspace.deleteTarget.name}"?`}
          message="This will permanently remove the saved chart configuration. This action cannot be undone."
          confirmLabel={workspace.isDeleting ? 'Deleting...' : 'Delete'}
          cancelLabel="Cancel"
          onCancel={() => workspace.setDeleteTarget(null)}
          onConfirm={workspace.confirmDelete}
        />
      ) : null}
    </AppLayout>
  )
}
