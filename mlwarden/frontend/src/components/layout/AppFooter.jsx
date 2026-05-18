import { GitFork, ExternalLink } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Logo } from '@/components/common/Logo.jsx'

const SOCIAL_LINKS = [
  { icon: <GitFork size={16} />, href: 'https://github.com/ke1rro/MLWarden', label: 'GitHub' },
]

const MAIN_LINKS = [
  { href: '/workspace', label: 'Workspace' },
  { href: '/projects', label: 'Projects' },
  { href: '/runs', label: 'Runs' },
  { href: '/charts', label: 'Charts' },
]

const LEGAL_LINKS = [
  { href: 'https://github.com/ke1rro/MLWarden/blob/main/LICENSE', label: 'MIT License', external: true },
]

export function AppFooter() {
  return (
    <footer className="app-footer">
      <div className="app-footer-inner">
        {/* Brand row — logo + tagline + GitHub icon */}
        <div className="app-footer-brand">
          <Link to="/" className="app-footer-logo" aria-label="MLWarden home">
            <Logo />
          </Link>
          <p className="app-footer-tagline">Open-source ML experiment tracking.</p>
          <div className="app-footer-social app-footer-social-inline">
            {SOCIAL_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={link.label}
                className="app-footer-icon-link"
              >
                {link.icon}
              </a>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="app-footer-bottom">
          <span className="app-footer-copy">© {new Date().getFullYear()} MLWarden – MIT License</span>

          <nav className="app-footer-nav" aria-label="Footer navigation">
            {MAIN_LINKS.map((link) => (
              <Link key={link.href} to={link.href} className="app-footer-link">
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="app-footer-social">
            {LEGAL_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="app-footer-link"
              >
                {link.label}
                <ExternalLink size={11} />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
