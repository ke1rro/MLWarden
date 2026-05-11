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
          MLWarden is currently showing prototype data. In the real app this page can be used
          when the backend or WebSocket stream is unavailable.
        </p>
        <div className="system-actions">
          <Link className="button button-primary button-md" to="/projects">
            <FolderKanban size={16} />
            Continue with mock data
          </Link>
        </div>
      </section>
    </main>
  )
}
