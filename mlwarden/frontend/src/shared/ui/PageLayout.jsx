import { AppHeader } from './AppHeader'

export function PageLayout({ children }) {
  return (
    <div className="app-shell">
      <AppHeader />
      <main className="page-main">{children}</main>
      <span className="watermark" aria-hidden="true">
        mlw
      </span>
      <footer className="page-footer">All rights reserved.</footer>
    </div>
  )
}
