import { LineChart, Plus } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { loadAllCharts, loadProjects } from '@/api/workspace.js'
import { EmptyState } from '@/components/common/EmptyState.jsx'
import { ErrorState } from '@/components/common/ErrorState.jsx'
import { LoadingState } from '@/components/common/LoadingState.jsx'
import { PageHeader } from '@/components/common/PageHeader.jsx'
import { SearchInput } from '@/components/common/SearchInput.jsx'
import { Toolbar } from '@/components/common/Toolbar.jsx'
import { AppLayout } from '@/components/layout/AppLayout.jsx'

export default function ChartsIndexPage() {
  const [charts, setCharts] = useState([])
  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

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

  return (
    <AppLayout breadcrumbs={[{ label: 'MLWarden', to: '/workspace' }, { label: 'Charts' }]}>
      <PageHeader title="Charts" subtitle="Saved chart configurations across all projects." />
      <Toolbar>
        <SearchInput value={query} onChange={setQuery} placeholder="Search charts" />
      </Toolbar>
      {isLoading ? <LoadingState message="Loading charts..." /> : null}
      {error ? <ErrorState message={error} /> : null}
      {!isLoading && !error && !charts.length ? (
        <section className="panel empty-action-panel">
          <EmptyState title="No saved charts yet." message="Open a project chart builder to create reusable chart configurations." />
          <div className="button-row">
            <Link className="button button-secondary button-md" to="/charts/new">
              <LineChart size={15} />
              Open chart builder
            </Link>
          </div>
        </section>
      ) : null}
      {!isLoading && !error ? (
        <div className="card-grid">
          <Link className="summary-card summary-card-new" to="/charts/new">
            <Plus size={18} />
            <strong>New chart</strong>
            <span>Create a new chart</span>
          </Link>
          {filteredCharts.map((chart) => (
            <Link
              className="summary-card"
              data-search-text={`${chart.name} ${chart.projectName} ${chart.chart_type}`}
              key={chart.id}
              to={`/projects/${chart.projectId}/charts?chart=${chart.id}`}
            >
              <LineChart size={18} />
              <strong>{chart.name}</strong>
              <span>{chart.projectName} · {chart.chart_type || chart.type || 'chart'}</span>
            </Link>
          ))}
        </div>
      ) : null}
    </AppLayout>
  )
}
