import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { StatusBadge } from '@/components/common/StatusBadge.jsx'
import { Button } from '@/components/common/Button.jsx'

export function RunHeader({ project, run, onRunAction }) {
  return (
    <section className="run-header panel">
      <div className="run-title-row">
        <Link className="back-link" to={`/projects/${project.id}`}><ArrowLeft size={16} /> Back</Link>
        <h1>{run.name}</h1>
        <StatusBadge status={run.status} />
        {onRunAction ? (
          <div className="button-row run-actions">
            {run.status === 'created' ? <Button onClick={() => onRunAction('start')} variant="secondary">Start</Button> : null}
            {run.status === 'running' ? <Button onClick={() => onRunAction('finish')} variant="secondary">Finish</Button> : null}
            {['created', 'running'].includes(run.status) ? (
              <>
                <Button onClick={() => onRunAction('fail')} variant="secondary">Fail</Button>
                <Button onClick={() => onRunAction('cancel')} variant="secondary">Cancel</Button>
              </>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className="run-meta-grid">
        <span>Project: <strong>{project.name}</strong></span>
        <span>Started: <strong>{run.started || 'not started'}</strong></span>
        <span>Duration: <strong>{run.duration}</strong></span>
        <span>Worker: <strong>{run.worker}</strong></span>
      </div>
    </section>
  )
}
