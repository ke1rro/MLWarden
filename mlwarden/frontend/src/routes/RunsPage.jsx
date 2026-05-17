import { ConfirmDialog } from '@/components/common/ConfirmDialog.jsx'
import { EmptyState } from '@/components/common/EmptyState.jsx'
import { ErrorState } from '@/components/common/ErrorState.jsx'
import { LoadingState } from '@/components/common/LoadingState.jsx'
import { SearchInput } from '@/components/common/SearchInput.jsx'
import { Toolbar } from '@/components/common/Toolbar.jsx'
import { AppLayout } from '@/components/layout/AppLayout.jsx'
import { RunTable } from '@/components/runs/RunTable.jsx'
import { runStatusOptions, useRunsWorkspace } from '@/hooks/useRunsWorkspace.js'

export default function RunsPage() {
  const workspace = useRunsWorkspace()

  return (
    <AppLayout
      breadcrumbs={[{ label: 'MLWarden', to: '/workspace' }, { label: 'Runs' }]}
      title="Runs"
      subtitle="All experiment runs across local projects."
    >
      <Toolbar>
        <SearchInput value={workspace.query} onChange={workspace.setQuery} placeholder="Search runs" />
        <select value={workspace.status} onChange={(event) => workspace.setStatus(event.target.value)}>
          {runStatusOptions.map((item) => <option key={item} value={item}>{item === 'all' ? 'All statuses' : item}</option>)}
        </select>
      </Toolbar>
      {workspace.isLoading ? <LoadingState message="Loading runs..." /> : null}
      {workspace.error ? <ErrorState message={workspace.error} /> : null}
      {!workspace.isLoading && !workspace.error && !workspace.runs.length ? (
        <EmptyState title="No runs yet." message="Create a project run or start a worker to populate this view." />
      ) : null}
      {!workspace.isLoading && !workspace.error && workspace.runs.length ? (
        <RunTable
          runs={workspace.filteredRuns}
          onDeleteRun={workspace.setDeleteTarget}
          showActions={false}
        />
      ) : null}
      {workspace.deleteTarget ? (
        <ConfirmDialog
          title={`Delete "${workspace.deleteTarget.name}"?`}
          message="This will permanently remove the run and its data. This action cannot be undone."
          confirmLabel={workspace.isDeleting ? 'Deleting...' : 'Delete'}
          cancelLabel="Cancel"
          onCancel={() => workspace.setDeleteTarget(null)}
          onConfirm={workspace.confirmDelete}
        />
      ) : null}
    </AppLayout>
  )
}
