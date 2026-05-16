import { useEffect, useMemo, useState } from 'react'
import { loadAllRuns, loadProjects } from '@/api/workspace.js'
import { EmptyState } from '@/components/common/EmptyState.jsx'
import { ErrorState } from '@/components/common/ErrorState.jsx'
import { LoadingState } from '@/components/common/LoadingState.jsx'
import { PageHeader } from '@/components/common/PageHeader.jsx'
import { SearchInput } from '@/components/common/SearchInput.jsx'
import { Toolbar } from '@/components/common/Toolbar.jsx'
import { AppLayout } from '@/components/layout/AppLayout.jsx'
import { RunTable } from '@/components/runs/RunTable.jsx'

const statuses = ['all', 'created', 'running', 'finished', 'failed', 'cancelled']

export default function RunsPage() {
  const [runs, setRuns] = useState([])
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    loadProjects()
      .then((projects) => loadAllRuns(projects))
      .then((nextRuns) => {
        if (!cancelled) setRuns(nextRuns)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to load runs.')
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const filteredRuns = useMemo(
    () =>
      runs.filter((run) => {
        const matchesStatus = status === 'all' || run.status === status
        const matchesQuery = `${run.name} ${run.projectName} ${run.description} ${run.tags?.join(' ')}`.toLowerCase().includes(query.toLowerCase())
        return matchesStatus && matchesQuery
      }),
    [query, runs, status],
  )

  return (
    <AppLayout breadcrumbs={[{ label: 'MLWarden', to: '/workspace' }, { label: 'Runs' }]}>
      <PageHeader title="Runs" subtitle="All experiment runs across local projects." />
      <Toolbar>
        <SearchInput value={query} onChange={setQuery} placeholder="Search runs" />
        <select value={status} onChange={(event) => setStatus(event.target.value)}>
          {statuses.map((item) => <option key={item} value={item}>{item === 'all' ? 'All statuses' : item}</option>)}
        </select>
      </Toolbar>
      {isLoading ? <LoadingState message="Loading runs..." /> : null}
      {error ? <ErrorState message={error} /> : null}
      {!isLoading && !error && !runs.length ? (
        <EmptyState title="No runs yet." message="Create a project run or start a worker to populate this view." />
      ) : null}
      {!isLoading && !error && runs.length ? <RunTable runs={filteredRuns} /> : null}
    </AppLayout>
  )
}
