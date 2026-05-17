import { SidebarNav } from './SidebarNav.jsx'
import { TopBar } from './TopBar.jsx'
import { PageHeader } from '@/components/common/PageHeader.jsx'
import { ToastHost } from '@/components/notifications/ToastHost.jsx'
import { useSearchHighlight } from '@/shared/useSearchHighlight.js'

export function AppLayout({ actions, breadcrumbs, children, subtitle, title }) {
  useSearchHighlight()

  return (
    <div className="app-shell">
      <TopBar breadcrumbs={breadcrumbs} />
      <div className="app-body">
        <SidebarNav />
        <main className="workspace">
          {title ? <PageHeader actions={actions} title={title} subtitle={subtitle} /> : null}
          {children}
        </main>
      </div>
      <ToastHost />
    </div>
  )
}
