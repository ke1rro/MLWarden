import { ArrowLeft, FolderKanban, Search } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/common/Button.jsx'
import { Logo } from '@/components/common/Logo.jsx'

export default function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <main className="system-page">
      <section className="system-card">
        <Logo />
        <div className="system-code">404</div>
        <h1>Route not found</h1>
        <p>
          MLWarden does not have that workspace route. Check the path, return to projects,
          or go back to the previous screen.
        </p>
        <div className="system-actions">
          <Link className="button button-primary button-md" to="/projects">
            <FolderKanban size={16} />
            Open projects
          </Link>
          <Button onClick={() => navigate(-1)} variant="secondary">
            <ArrowLeft size={16} />
            Go back
          </Button>
        </div>
        <div className="system-hint">
          <Search size={15} />
          Try `/projects`, `/runs/run-dulcet-snowflake-18`, or `/settings`.
        </div>
      </section>
    </main>
  )
}
