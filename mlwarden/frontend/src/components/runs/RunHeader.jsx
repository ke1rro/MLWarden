import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { StatusBadge } from '@/components/common/StatusBadge.jsx'
import { ActionMenu } from '@/components/common/ActionMenu.jsx'

export function RunHeader({ project, run }) {
  return (
    <section className="run-header panel">
      <div className="run-title-row">
        <Link className="back-link" to={`/projects/${project.id}`}><ArrowLeft size={16} /> Back</Link>
        <h1>{run.name}</h1>
        <StatusBadge status={run.status} />
        <ActionMenu />
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
