import { AlertTriangle, FolderKanban, RotateCcw } from 'lucide-react'
import { Link, useRouteError } from 'react-router-dom'
import { Button } from '@/components/common/Button.jsx'
import { Logo } from '@/components/common/Logo.jsx'

export default function RouteErrorPage() {
  const error = useRouteError()
  const message = error?.statusText || error?.message || 'The current route failed to render.'

  return (
    <main className="system-page">
      <section className="system-card">
        <Logo />
        <div className="system-icon danger">
          <AlertTriangle size={26} />
        </div>
        <h1>Workspace interrupted</h1>
        <p>{message}</p>
        <div className="system-actions">
          <Button onClick={() => window.location.reload()} variant="primary">
            <RotateCcw size={16} />
            Reload
          </Button>
          <Link className="button button-secondary button-md" to="/projects">
            <FolderKanban size={16} />
            Open projects
          </Link>
        </div>
      </section>
    </main>
  )
}
