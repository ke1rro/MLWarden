import { FolderKanban, WifiOff } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Logo } from '@/components/common/Logo.jsx'

export default function OfflinePage() {
  return (
    <main className="system-page">
      <section className="system-card">
        <Logo />
        <div className="system-icon">
          <WifiOff size={26} />
        </div>
        <h1>Connection unavailable</h1>
        <p>
          MLWarden cannot reach the backend or WebSocket stream right now. Check the
          backend service and try again.
        </p>
        <div className="system-actions">
          <Link className="button button-primary button-md" to="/projects">
            <FolderKanban size={16} />
            Retry workspace
          </Link>
        </div>
      </section>
    </main>
  )
}
