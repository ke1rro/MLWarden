import { ChevronDown } from 'lucide-react'
import { Link } from 'react-router-dom'

const navItems = ['settings', 'about', 'manual']

export function AppHeader() {
  return (
    <header className="app-header">
      <div className="header-glass-inner">
        <Link className="brand-link" to="/">
          MLWarden
        </Link>

        <div className="header-right">
          <nav className="top-nav" aria-label="Main navigation">
            {navItems.map((item) => (
              <button className="nav-link" key={item} type="button">
                {item}
              </button>
            ))}
          </nav>

          <button className="profile-trigger" type="button" aria-label="Open user menu">
            <span className="avatar" aria-hidden="true">U</span>
            <ChevronDown size={16} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </header>
  )
}
