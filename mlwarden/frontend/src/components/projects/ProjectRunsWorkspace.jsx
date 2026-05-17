import { Button } from '@/components/common/Button.jsx'
import { SearchInput } from '@/components/common/SearchInput.jsx'
import { Toolbar } from '@/components/common/Toolbar.jsx'
import { RunTable } from '@/components/runs/RunTable.jsx'

const statusOptions = ['created', 'running', 'finished', 'failed', 'cancelled']

function ProjectRunFilters({
  query,
  status,
  onQueryChange,
  onStatusChange,
}) {
  return (
    <Toolbar>
      <SearchInput value={query} onChange={onQueryChange} placeholder="Search run names" />
      <select value={status} onChange={(event) => onStatusChange(event.target.value)}>
        <option value="all">All statuses</option>
        {statusOptions.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </Toolbar>
  )
}

function ComparisonActionBar({ onResetComparison, onStartComparison, selectedCount }) {
  return (
    <div className="comparison-action-bar panel">
      <div>
        <strong>{selectedCount} selected</strong>
        <p>Select two or more metric-bearing runs to create a combined comparison workspace.</p>
      </div>
      <div className="button-row">
        <Button disabled={selectedCount < 2} onClick={onStartComparison}>Combine Runs</Button>
        <Button disabled={!selectedCount} onClick={onResetComparison} variant="secondary">Reset selection</Button>
      </div>
    </div>
  )
}

export function ProjectRunsWorkspace({
  disabledRunIds,
  onDeleteRun,
  onQueryChange,
  onResetComparison,
  onRunSelect,
  onStartComparison,
  onStatusChange,
  query,
  runColorMap,
  runs,
  selectedRunIds,
  status,
}) {
  return (
    <>
      <ProjectRunFilters
        query={query}
        status={status}
        onQueryChange={onQueryChange}
        onStatusChange={onStatusChange}
      />
      <ComparisonActionBar
        onResetComparison={onResetComparison}
        onStartComparison={onStartComparison}
        selectedCount={selectedRunIds.length}
      />
      <RunTable
        onDeleteRun={onDeleteRun}
        runColorMap={runColorMap}
        runs={runs}
        selection={{
          disabledRunIds,
          onSelect: onRunSelect,
          selectedRunIds,
        }}
      />
    </>
  )
}
