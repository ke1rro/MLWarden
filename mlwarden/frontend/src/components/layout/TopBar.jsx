import { Bell, CircleHelp, Search } from 'lucide-react'
import { useAuth } from '../../app/useAuth.js'
import { Breadcrumbs } from './Breadcrumbs.jsx'
import { IconButton } from '../common/IconButton.jsx'

export function TopBar({ breadcrumbs }) {
  const { user, logout } = useAuth()

  return (
    <header className="topbar">
      <div className="brand-mark" aria-label="MLWarden">
        <span className="brand-glyph">M</span>
        <span className="brand-name">MLWarden</span>
      </div>
      <Breadcrumbs items={breadcrumbs} />
      <div className="topbar-actions">
        <label className="global-search">
          <Search size={15} />
          <input type="search" placeholder="Search runs, metrics, artifacts" />
        </label>
        <IconButton label="Notifications" icon={Bell} />
        <IconButton label="Help" icon={CircleHelp} />
        <button className="user-chip" type="button" onClick={logout} title="Log out">
          <span>{user?.initials || 'AD'}</span>
          <strong>{user?.username || 'admin'}</strong>
        </button>
      </div>
    </header>
  )
}
