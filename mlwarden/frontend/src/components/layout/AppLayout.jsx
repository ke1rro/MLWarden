import { SidebarNav } from './SidebarNav.jsx'
import { TopBar } from './TopBar.jsx'
import { ToastHost } from '@/components/notifications/ToastHost.jsx'

export function AppLayout({ breadcrumbs, children }) {
  return (
    <div className="app-shell">
      <TopBar breadcrumbs={breadcrumbs} />
      <div className="app-body">
        <SidebarNav />
        <main className="workspace">
          {children}
        </main>
      </div>
      <ToastHost />
    </div>
  )
}
