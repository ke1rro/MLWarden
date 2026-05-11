import { Link } from 'react-router-dom'
import { Button } from '@/components/common/Button.jsx'
import { EmptyState } from '@/components/common/EmptyState.jsx'
import { StatusBadge } from '@/components/common/StatusBadge.jsx'

function RunActions({ run, onRunAction }) {
  if (!onRunAction) return null

  return (
    <div className="table-actions">
      {run.status === 'created' ? <Button onClick={() => onRunAction(run, 'start')} size="sm" variant="secondary">Start</Button> : null}
      {run.status === 'running' ? <Button onClick={() => onRunAction(run, 'finish')} size="sm" variant="secondary">Finish</Button> : null}
      {['created', 'running'].includes(run.status) ? (
        <>
          <Button onClick={() => onRunAction(run, 'fail')} size="sm" variant="secondary">Fail</Button>
          <Button onClick={() => onRunAction(run, 'cancel')} size="sm" variant="secondary">Cancel</Button>
        </>
      ) : null}
    </div>
  )
}

export function RunTable({ runs, onRunAction }) {
  if (!runs.length) {
    return <EmptyState title="No runs match these filters." message="Adjust the filters or start a worker run." />
  }

  return (
    <div className="table-shell">
      <table className="data-table">
        <thead>
          <tr>
            <th>Status</th>
            <th>Run name</th>
            <th>Created</th>
            <th>Duration</th>
            <th>Best PSNR</th>
            <th>Final loss</th>
            <th>Tags</th>
            <th>Worker</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => (
            <tr key={run.id}>
              <td><StatusBadge status={run.status} /></td>
              <td>
                <Link className="table-link" to={`/runs/${run.id}`}>
                  {run.name}
                </Link>
              </td>
              <td>{run.created}</td>
              <td>{run.duration}</td>
              <td>{run.bestPsnr ?? 'n/a'}</td>
              <td>{run.finalLoss ?? 'n/a'}</td>
              <td>
                <div className="tag-row">
                  {run.tags.map((tag) => (
                    <span className="tag" key={tag}>{tag}</span>
                  ))}
                </div>
              </td>
              <td>{run.worker}</td>
              <td><RunActions run={run} onRunAction={onRunAction} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
