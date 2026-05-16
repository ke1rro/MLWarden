import { Bell, CircleHelp, LogOut, Search, Settings, UserRound } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/app/useAuth.js'
import { useNotifications } from '@/app/useNotifications.js'
import { Button } from '@/components/common/Button.jsx'
import { ConfirmDialog } from '@/components/common/ConfirmDialog.jsx'
import { GlobalSearchModal } from '@/components/common/GlobalSearchModal.jsx'
import { Breadcrumbs } from './Breadcrumbs.jsx'
import { IconButton } from '@/components/common/IconButton.jsx'
import { Logo } from '@/components/common/Logo.jsx'
import { Modal } from '@/components/common/Modal.jsx'
import { NotificationHistory } from '@/components/notifications/NotificationHistory.jsx'

export function TopBar({ breadcrumbs }) {
  const { user, logout } = useAuth()
  const { markAllRead, unreadCount } = useNotifications()
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isHelpOpen, setIsHelpOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false)
  const notificationRef = useRef(null)
  const userRef = useRef(null)

  useEffect(() => {
    if (!isHistoryOpen && !isUserMenuOpen) return undefined

    function handlePointerDown(event) {
      if (isHistoryOpen && !notificationRef.current?.contains(event.target)) {
        setIsHistoryOpen(false)
      }
      if (isUserMenuOpen && !userRef.current?.contains(event.target)) {
        setIsUserMenuOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [isHistoryOpen, isUserMenuOpen])

  function handleToggleHistory() {
    setIsHistoryOpen((current) => !current)
    markAllRead()
  }

  function handleSearchSubmit(event) {
    event.preventDefault()
    setIsSearchOpen(true)
  }

  function handleConfirmLogout() {
    setIsLogoutConfirmOpen(false)
    setIsUserMenuOpen(false)
    logout()
  }

  return (
    <header className="topbar">
      <Logo className="topbar-logo" />
      <Breadcrumbs items={breadcrumbs} />
      <div className="topbar-actions">
        <form className="global-search" onSubmit={handleSearchSubmit}>
          <Search size={15} />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            onFocus={() => setIsSearchOpen(true)}
            type="search"
            placeholder="Search workspace"
          />
        </form>
        <div className="notification-menu" ref={notificationRef}>
          <button
            aria-expanded={isHistoryOpen}
            aria-label="View notification history"
            className="notification-button"
            onClick={handleToggleHistory}
            type="button"
          >
            <Bell size={16} />
            {unreadCount ? <span>{unreadCount}</span> : null}
          </button>
          {isHistoryOpen ? <NotificationHistory onClose={() => setIsHistoryOpen(false)} /> : null}
        </div>
        <IconButton label="Help" icon={CircleHelp} onClick={() => setIsHelpOpen(true)} />
        <div className="user-menu" ref={userRef}>
          <button
            aria-expanded={isUserMenuOpen}
            className="user-chip"
            type="button"
            onClick={() => setIsUserMenuOpen((current) => !current)}
            title="User menu"
          >
            <span>{user?.initials || 'AD'}</span>
            <strong>{user?.username || 'admin'}</strong>
          </button>
          {isUserMenuOpen ? (
            <div className="user-popover">
              <div className="user-popover-header">
                <UserRound size={17} />
                <div>
                  <strong>{user?.username || 'admin'}</strong>
                  <span>{user?.role || 'User'}</span>
                </div>
              </div>
              <Link to="/settings" onClick={() => setIsUserMenuOpen(false)}>
                <Settings size={15} />
                Settings
              </Link>
              <button type="button" onClick={() => setIsLogoutConfirmOpen(true)}>
                <LogOut size={15} />
                Log out
              </button>
            </div>
          ) : null}
        </div>
      </div>
      {isSearchOpen ? (
        <GlobalSearchModal
          initialQuery={searchQuery}
          onClose={() => setIsSearchOpen(false)}
        />
      ) : null}
      {isHelpOpen ? (
        <Modal
          title="MLWarden SDK guide"
          description="Minimal Python client flow for sending local experiment data to this workspace."
          onClose={() => setIsHelpOpen(false)}
          footer={<Button variant="secondary" onClick={() => setIsHelpOpen(false)}>Close</Button>}
          size="lg"
        >
          <div className="help-guide">
            <section>
              <h3>1. Configure the client</h3>
              <pre>{`from mlwarden import MLWardenClient

client = MLWardenClient(
    base_url="http://localhost:8000",
    api_key="dev-api-key",
)`}</pre>
            </section>
            <section>
              <h3>2. Create a project and run</h3>
              <pre>{`project = client.project("my-project")
run = project.create_run(
    name="baseline",
    tags=["dev", "cnn"],
)`}</pre>
            </section>
            <section>
              <h3>3. Log data</h3>
              <pre>{`run.log_metric("val.loss", 0.218, step=10)
run.log_table("validation", [{"image": "001", "psnr": 30.4}])
run.upload_artifact("model.pt", artifact_path="checkpoints/model.pt")
run.finish(summary={"final_loss": 0.218})`}</pre>
            </section>
          </div>
        </Modal>
      ) : null}
      {isLogoutConfirmOpen ? (
        <ConfirmDialog
          title="Log out?"
          message="You will return to the sign-in screen. Unsaved local UI filters will be cleared."
          confirmLabel="Yes"
          cancelLabel="No"
          onCancel={() => setIsLogoutConfirmOpen(false)}
          onConfirm={handleConfirmLogout}
        />
      ) : null}
    </header>
  )
}
