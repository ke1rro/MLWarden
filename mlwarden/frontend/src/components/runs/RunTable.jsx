import { ExternalLink, Trash2 } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { ActionMenu } from '@/components/common/ActionMenu.jsx'
import { EmptyState } from '@/components/common/EmptyState.jsx'
import { StatusBadge } from '@/components/common/StatusBadge.jsx'

function RunSelectionCell({ index, isDisabled, isSelected, onSelect, run }) {
  if (!onSelect) return null
  return (
    <td className="run-select-cell">
      <input
        checked={isSelected}
        disabled={isDisabled}
        onChange={() => {}}
        onClick={(event) => onSelect(run, event, index)}
        type="checkbox"
      />
    </td>
  )
}

function RunNameCell({ run, runColorMap }) {
  return (
    <td>
      <Link className="table-link" to={`/runs/${run.id}`}>
        {runColorMap[run.id] ? <span className="run-color-dot" style={{ background: runColorMap[run.id] }} /> : null}
        {run.name}
      </Link>
    </td>
  )
}

function RunProjectCell({ run }) {
  if (!run.projectName) return null
  return (
    <td>
      {run.projectId ? <Link className="table-link" to={`/projects/${run.projectId}`}>{run.projectName}</Link> : run.projectName}
    </td>
  )
}

function RunTagsCell({ tags }) {
  return (
    <td>
      <div className="tag-row">
        {tags.map((tag) => (
          <span className="tag" key={tag}>{tag}</span>
        ))}
      </div>
    </td>
  )
}

function RunRowActions({ navigate, onDeleteRun, run }) {
  return (
    <td>
      <ActionMenu items={[
        { label: 'View run', icon: ExternalLink, onSelect: () => navigate(`/runs/${run.id}`) },
        ...(onDeleteRun ? [{ label: 'Delete run', icon: Trash2, onSelect: () => onDeleteRun(run) }] : []),
      ]} />
    </td>
  )
}

function RunTableRow({
  index,
  isDisabled,
  isSelected,
  navigate,
  onDeleteRun,
  onSelect,
  run,
  runColorMap,
  showActions,
  showProject,
}) {
  return (
    <tr className={`${isSelected ? 'is-selected' : ''} ${isDisabled ? 'is-disabled' : ''}`} data-search-text={`${run.name} ${run.projectName || ''} ${run.status} ${run.tags.join(' ')}`} key={run.id}>
      <RunSelectionCell
        index={index}
        isDisabled={isDisabled}
        isSelected={isSelected}
        onSelect={onSelect}
        run={run}
      />
      <td><StatusBadge status={run.status} /></td>
      <RunNameCell run={run} runColorMap={runColorMap} />
      {showProject ? <RunProjectCell run={run} /> : null}
      <td>{run.created}</td>
      <td>{run.duration}</td>
      <td>{run.bestPsnr ?? run.finalLoss ?? '—'}</td>
      <td>{run.finalLoss ?? '—'}</td>
      <RunTagsCell tags={run.tags} />
      <td>{run.worker}</td>
      {showActions ? <RunRowActions navigate={navigate} onDeleteRun={onDeleteRun} run={run} /> : null}
    </tr>
  )
}

export function RunTable({
  runs,
  onDeleteRun,
  selection = null,
  runColorMap = {},
  showActions = true,
}) {
  const navigate = useNavigate()
  const showProject = runs.some((run) => run.projectName)
  const selectedSet = new Set(selection?.selectedRunIds || [])
  const disabledSet = new Set(selection?.disabledRunIds || [])
  const onSelect = selection?.onSelect

  if (!runs.length) {
    return <EmptyState title="No runs match these filters." message="Adjust the filters or start a worker run." />
  }

  return (
    <div className="table-shell">
      <table className="data-table">
        <thead>
          <tr>
            {onSelect ? <th className="run-select-heading">Select</th> : null}
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
              <RunTableRow
                index={index}
                isDisabled={isDisabled}
                isSelected={isSelected}
                key={run.id}
                navigate={navigate}
                onDeleteRun={onDeleteRun}
                onSelect={onSelect}
                run={run}
                runColorMap={runColorMap}
                showActions={showActions}
                showProject={showProject}
              />
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
