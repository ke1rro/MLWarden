import { LineChart, Plus, ExternalLink, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { deleteChart } from '@/api/charts.js'
import { loadAllCharts, loadProjects } from '@/api/workspace.js'
import { ActionMenu } from '@/components/common/ActionMenu.jsx'
import { ConfirmDialog } from '@/components/common/ConfirmDialog.jsx'
import { EmptyState } from '@/components/common/EmptyState.jsx'
import { ErrorState } from '@/components/common/ErrorState.jsx'
import { LoadingState } from '@/components/common/LoadingState.jsx'
import { PageHeader } from '@/components/common/PageHeader.jsx'
import { SearchInput } from '@/components/common/SearchInput.jsx'
import { Toolbar } from '@/components/common/Toolbar.jsx'
import { AppLayout } from '@/components/layout/AppLayout.jsx'

export default function ChartsIndexPage() {
  const navigate = useNavigate()
  const [charts, setCharts] = useState([])
  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  function loadCharts() {
    return loadProjects()
      .then(async (nextProjects) => {
        const nextCharts = await loadAllCharts(nextProjects)
        setCharts(nextCharts)
      })
      .catch((err) => {
        setError(err.message || 'Failed to load charts.')
      })
  }

  useEffect(() => {
    let cancelled = false
    loadProjects()
      .then(async (nextProjects) => {
        const nextCharts = await loadAllCharts(nextProjects)
        if (!cancelled) setCharts(nextCharts)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to load charts.')
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => { cancelled = true }
  }, [])

  const filteredCharts = useMemo(
    () => charts.filter((chart) => `${chart.name} ${chart.projectName} ${chart.chart_type || chart.type || ''}`.toLowerCase().includes(query.toLowerCase())),
    [charts, query],
  )

  async function handleConfirmDelete() {
    setIsDeleting(true)
    setError('')
    try {
      await deleteChart(deleteTarget.id)
      setDeleteTarget(null)
      await loadCharts()
    } catch (err) {
      setError(err.message || 'Failed to delete chart.')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <AppLayout breadcrumbs={[{ label: 'MLWarden', to: '/workspace' }, { label: 'Charts' }]}>
      <PageHeader title="Charts" subtitle="Saved chart configurations across all projects." />
      <Toolbar>
        <SearchInput value={query} onChange={setQuery} placeholder="Search charts" />
      </Toolbar>
      {isLoading ? <LoadingState message="Loading charts..." /> : null}
      {error ? <ErrorState message={error} /> : null}
      {!isLoading && !error ? (
        <div className="card-grid">
          <Link className="summary-card summary-card-new" to="/charts/new">
            <Plus size={18} />
            <strong>New chart</strong>
            <span>Create a new chart</span>
          </Link>
          {filteredCharts.map((chart) => (
            <div
              className="summary-card summary-card-with-actions"
              data-search-text={`${chart.name} ${chart.projectName} ${chart.chart_type}`}
              key={chart.id}
            >
              <button
                className="summary-card-body"
                onClick={() => navigate(`/projects/${chart.projectId}/charts?chart=${chart.id}`)}
                type="button"
              >
                <LineChart size={18} />
                <strong>{chart.name}</strong>
                <span>{chart.projectName} · {chart.chart_type || chart.type || 'chart'}</span>
              </button>
              <div className="summary-card-menu">
                <ActionMenu items={[
                  {
                    label: 'View chart',
                    icon: ExternalLink,
                    onSelect: () => navigate(`/projects/${chart.projectId}/charts?chart=${chart.id}`),
                  },
                  {
                    label: 'Delete chart',
                    icon: Trash2,
                    onSelect: () => setDeleteTarget(chart),
                  },
                ]} />
              </div>
            </div>
          ))}
        </div>
      ) : null}
      {deleteTarget ? (
        <ConfirmDialog
          title={`Delete "${deleteTarget.name}"?`}
          message="This will permanently remove the saved chart configuration. This action cannot be undone."
          confirmLabel={isDeleting ? 'Deleting...' : 'Delete'}
          cancelLabel="Cancel"
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleConfirmDelete}
        />
      ) : null}
    </AppLayout>
  )
}
