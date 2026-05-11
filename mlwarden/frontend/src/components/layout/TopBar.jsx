import { Bell, CircleHelp, Search } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/app/useAuth.js'
import { useNotifications } from '@/app/useNotifications.js'
import { Breadcrumbs } from './Breadcrumbs.jsx'
import { IconButton } from '@/components/common/IconButton.jsx'
import { Logo } from '@/components/common/Logo.jsx'
import { NotificationHistory } from '@/components/notifications/NotificationHistory.jsx'

export function TopBar({ breadcrumbs }) {
  const { user, logout } = useAuth()
  const { markAllRead, unreadCount } = useNotifications()
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const notificationRef = useRef(null)

  useEffect(() => {
    if (!isHistoryOpen) return undefined

    function handlePointerDown(event) {
      if (!notificationRef.current?.contains(event.target)) {
        setIsHistoryOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [isHistoryOpen])

  function handleToggleHistory() {
    setIsHistoryOpen((current) => !current)
    markAllRead()
  }

  return (
    <header className="topbar">
      <Logo className="topbar-logo" />
      <Breadcrumbs items={breadcrumbs} />
      <div className="topbar-actions">
        <label className="global-search">
          <Search size={15} />
          <input type="search" placeholder="Search runs, metrics, artifacts" />
        </label>
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
        <IconButton label="Help" icon={CircleHelp} />
        <button className="user-chip" type="button" onClick={logout} title="Log out">
          <span>{user?.initials || 'AD'}</span>
          <strong>{user?.username || 'admin'}</strong>
        </button>
      </div>
    </header>
  )
}
