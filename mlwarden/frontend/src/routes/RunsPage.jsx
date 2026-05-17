import { useCallback, useEffect, useMemo, useState } from 'react'
import { deleteRun } from '@/api/runs.js'
import { loadAllRuns, loadProjects } from '@/api/workspace.js'
import { ConfirmDialog } from '@/components/common/ConfirmDialog.jsx'
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
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const reload = useCallback(() => {
    loadProjects()
      .then((projects) => loadAllRuns(projects))
      .then((nextRuns) => setRuns(nextRuns))
      .catch((err) => setError(err.message || 'Failed to load runs.'))
  }, [])

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

  async function handleConfirmDelete() {
    setIsDeleting(true)
    setError('')
    try {
      await deleteRun(deleteTarget.id)
      setDeleteTarget(null)
      reload()
    } catch (err) {
      setError(err.message || 'Failed to delete run.')
    } finally {
      setIsDeleting(false)
    }
  }

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
      {!isLoading && !error && runs.length ? (
        <RunTable
          runs={filteredRuns}
          onDeleteRun={(run) => setDeleteTarget(run)}
          showActions={false}
        />
      ) : null}
      {deleteTarget ? (
        <ConfirmDialog
          title={`Delete "${deleteTarget.name}"?`}
          message="This will permanently remove the run and its data. This action cannot be undone."
          confirmLabel={isDeleting ? 'Deleting...' : 'Delete'}
          cancelLabel="Cancel"
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleConfirmDelete}
        />
      ) : null}
    </AppLayout>
  )
}
