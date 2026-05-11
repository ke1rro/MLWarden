import { Outlet } from 'react-router-dom'
import { SidebarNav } from './SidebarNav.jsx'
import { TopBar } from './TopBar.jsx'
import { ToastHost } from '../notifications/ToastHost.jsx'

export function AppLayout({ breadcrumbs, children }) {
  return (
    <div className="app-shell">
      <TopBar breadcrumbs={breadcrumbs} />
      <div className="app-body">
        <SidebarNav />
        <main className="workspace">
          {children || <Outlet />}
        </main>
      </div>
      <ToastHost />
    </div>
  )
}
