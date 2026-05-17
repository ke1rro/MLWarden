import { Bell, CircleHelp, LogOut, Search, UserRound } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/app/useAuth.js'
import { useNotifications } from '@/app/useNotifications.js'
import { ConfirmDialog } from '@/components/common/ConfirmDialog.jsx'
import { GlobalSearchModal } from '@/components/common/GlobalSearchModal.jsx'
import { Breadcrumbs } from './Breadcrumbs.jsx'
import { IconButton } from '@/components/common/IconButton.jsx'
import { Logo } from '@/components/common/Logo.jsx'
import { NotificationHistory } from '@/components/notifications/NotificationHistory.jsx'

function useOutsideClose(isOpen, ref, onClose) {
  useEffect(() => {
    if (!isOpen) return undefined

    function handlePointerDown(event) {
      if (!ref.current?.contains(event.target)) onClose()
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [isOpen, onClose, ref])
}

function GlobalSearchControl() {
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const searchRef = useRef(null)
  useOutsideClose(isSearchOpen, searchRef, () => setIsSearchOpen(false))

  function handleSearchSubmit(event) {
    event.preventDefault()
    setIsSearchOpen(true)
  }

  return (
    <div className="global-search-wrap" ref={searchRef}>
      <form className="global-search" onSubmit={handleSearchSubmit}>
        <Search size={15} />
        <input
          value={searchQuery}
          onChange={(event) => {
            setSearchQuery(event.target.value)
            setIsSearchOpen(true)
          }}
          onFocus={() => setIsSearchOpen(true)}
          type="search"
          placeholder="Search workspace"
        />
      </form>
      {isSearchOpen ? (
        <GlobalSearchModal
          query={searchQuery}
          onClose={() => setIsSearchOpen(false)}
        />
      ) : null}
    </div>
  )
}

function NotificationsMenu() {
  const { markAllRead, unreadCount } = useNotifications()
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const notificationRef = useRef(null)
  useOutsideClose(isHistoryOpen, notificationRef, () => setIsHistoryOpen(false))

  function handleToggleHistory() {
    setIsHistoryOpen((current) => !current)
    markAllRead()
  }

  return (
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
  )
}

function HelpLink() {
  return (
    <Link aria-label="Help" className="icon-button" title="Help" to="/faq">
      <CircleHelp size={16} />
    </Link>
  )
}

function UserMenu() {
  const { user, logout } = useAuth()
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false)
  const userRef = useRef(null)
  useOutsideClose(isUserMenuOpen, userRef, () => setIsUserMenuOpen(false))

  return (
    <>
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

            <button type="button" onClick={() => setIsLogoutConfirmOpen(true)}>
              <LogOut size={15} />
              Log out
            </button>
          </div>
        ) : null}
      </div>
      {isLogoutConfirmOpen ? (
        <ConfirmDialog
          title="Log out?"
          message="You will return to the sign-in screen. Unsaved local UI filters will be cleared."
          confirmLabel="Yes"
          cancelLabel="No"
          onCancel={() => setIsLogoutConfirmOpen(false)}
          onConfirm={() => {
            setIsLogoutConfirmOpen(false)
            setIsUserMenuOpen(false)
            logout()
          }}
        />
      ) : null}
    </>
  )
}

export function TopBar({ breadcrumbs }) {
  return (
    <header className="topbar">
      <Logo className="topbar-logo" />
      <Breadcrumbs items={breadcrumbs} />
      <div className="topbar-actions">
        <GlobalSearchControl />
        <NotificationsMenu />
        <HelpLink />
        <UserMenu />
      </div>
    </header>
  )
}
