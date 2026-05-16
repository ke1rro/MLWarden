import clsx from 'clsx'
import { Activity, Boxes, FileArchive, FolderKanban, Gauge, LineChart, TableProperties } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'

const navItems = [
  { to: '/workspace', label: 'Workspace', icon: Gauge, match: ({ pathname }) => pathname === '/workspace' || /^\/projects\/[^/]+$/.test(pathname) },
  { to: '/projects', label: 'Projects', icon: FolderKanban, match: ({ pathname }) => pathname === '/projects' },
  { to: '/runs', label: 'Runs', icon: TableProperties, match: ({ pathname, searchParams }) => (pathname === '/runs' || /^\/runs\/[^/]+$/.test(pathname)) && searchParams.get('tab') !== 'artifacts' },
  { to: '/charts', label: 'Charts', icon: LineChart, match: ({ pathname }) => pathname === '/charts' || pathname.endsWith('/charts') },
  { to: '/artifacts', label: 'Artifacts', icon: FileArchive, match: ({ pathname, searchParams }) => pathname === '/artifacts' || searchParams.get('tab') === 'artifacts' },
  { to: '/system', label: 'System', icon: Activity },
]

export function SidebarNav() {
  const location = useLocation()
  const searchParams = new URLSearchParams(location.search)

  return (
    <aside className="sidebar">
      <div className="sidebar-stack">
        {navItems.map((item) => {
          const Icon = item.icon || Boxes
          const isActive = item.match
            ? item.match({ pathname: location.pathname, searchParams })
            : location.pathname === item.to
          return (
            <Link className={clsx('sidebar-link', isActive && 'active')} key={item.label} to={item.to} title={item.label}>
              <Icon size={18} />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </div>
    </aside>
  )
}
