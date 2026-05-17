import { ExternalLink, Trash2 } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { ActionMenu } from '@/components/common/ActionMenu.jsx'
import { EmptyState } from '@/components/common/EmptyState.jsx'
import { StatusBadge } from '@/components/common/StatusBadge.jsx'

export function RunTable({
  runs,
  onDeleteRun,
  selectable = false,
  selectedRunIds = [],
  disabledRunIds = [],
  runColorMap = {},
  onRunSelect,
  compact = false,
  showActions = true,
}) {
  const navigate = useNavigate()
  const showProject = runs.some((run) => run.projectName)
  const selectedSet = new Set(selectedRunIds)
  const disabledSet = new Set(disabledRunIds)
  const renderCheckbox = (run, index, isSelected, isDisabled) => (
    <input
      checked={isSelected}
      disabled={isDisabled}
      onChange={() => {}}
      onClick={(event) => onRunSelect?.(run, event, index)}
      type="checkbox"
    />
  )

  if (!runs.length) {
    return <EmptyState title="No runs match these filters." message="Adjust the filters or start a worker run." />
  }

  if (compact) {
    return (
      <div className="table-shell compact-runs">
        <table className="data-table">
          <thead>
            <tr>
              {selectable ? <th className="run-select-heading">Select</th> : null}
              <th>Run</th>
              <th>Metric</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((run, index) => {
              const isSelected = selectedSet.has(run.id)
              const isDisabled = disabledSet.has(run.id)
              return (
                <tr className={`${isSelected ? 'is-selected' : ''} ${isDisabled ? 'is-disabled' : ''}`} data-search-text={`${run.name} ${run.status} ${run.tags.join(' ')}`} key={run.id}>
                  {selectable ? <td className="run-select-cell">{renderCheckbox(run, index, isSelected, isDisabled)}</td> : null}
                  <td>
                    <Link className="table-link run-name-link" to={`/runs/${run.id}`}>
                      {runColorMap[run.id] ? <span className="run-color-dot" style={{ background: runColorMap[run.id] }} /> : null}
                      {run.name}
                    </Link>
                  </td>
                  <td>{run.bestPsnr ?? run.finalLoss ?? 'n/a'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="table-shell">
      <table className="data-table">
        <thead>
          <tr>
            {selectable ? <th className="run-select-heading">Select</th> : null}
            <th>Status</th>
            <th>Run name</th>
            {showProject ? <th>Project</th> : null}
            <th>Created</th>
            <th>Duration</th>
            <th>Summary metric</th>
            <th>Final loss</th>
            <th>Tags</th>
            <th>Worker</th>
            {showActions ? <th>Actions</th> : null}
          </tr>
        </thead>
        <tbody>
          {runs.map((run, index) => {
            const isSelected = selectedSet.has(run.id)
            const isDisabled = disabledSet.has(run.id)
            return (
              <tr className={`${isSelected ? 'is-selected' : ''} ${isDisabled ? 'is-disabled' : ''}`} data-search-text={`${run.name} ${run.projectName || ''} ${run.status} ${run.tags.join(' ')}`} key={run.id}>
                {selectable ? (
                  <td className="run-select-cell">
                    {renderCheckbox(run, index, isSelected, isDisabled)}
                  </td>
                ) : null}
                <td><StatusBadge status={run.status} /></td>
                <td>
                  <Link className="table-link" to={`/runs/${run.id}`}>
                    {runColorMap[run.id] ? <span className="run-color-dot" style={{ background: runColorMap[run.id] }} /> : null}
                    {run.name}
                  </Link>
                </td>
                {showProject ? (
                  <td>
                    {run.projectId ? <Link className="table-link" to={`/projects/${run.projectId}`}>{run.projectName}</Link> : run.projectName}
                  </td>
                ) : null}
                <td>{run.created}</td>
                <td>{run.duration}</td>
                <td>{run.bestPsnr ?? run.finalLoss ?? 'n/a'}</td>
                <td>{run.finalLoss ?? 'n/a'}</td>
                <td>
                  <div className="tag-row">
                    {run.tags.map((tag) => (
                      <span className="tag" key={tag}>{tag}</span>
                    ))}
                  </div>
                </td>
                <td>{run.worker}</td>
                {showActions ? (
                  <td>
                    <ActionMenu items={[
                      { label: 'View run', icon: ExternalLink, onSelect: () => navigate(`/runs/${run.id}`) },
                      ...(onDeleteRun ? [{ label: 'Delete run', icon: Trash2, onSelect: () => onDeleteRun(run) }] : []),
                    ]} />
                  </td>
                ) : null}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
