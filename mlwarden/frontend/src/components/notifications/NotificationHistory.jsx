import { BellRing, CheckCheck, WifiOff } from 'lucide-react'
import { useNotifications } from '@/app/useNotifications.js'
import { Button } from '@/components/common/Button.jsx'

function formatTimestamp(timestamp) {
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    day: 'numeric',
  }).format(new Date(timestamp))
}

export function NotificationHistory({ onClose }) {
  const { notifications, markAllRead } = useNotifications()

  function handleMarkRead() {
    markAllRead()
    onClose()
  }

  return (
    <section className="notification-popover" aria-label="Notification history">
      <header className="notification-popover-header">
        <div>
          <h2>Notification history</h2>
          <p>Recent run and connection events from the backend.</p>
        </div>
        <Button onClick={handleMarkRead} variant="secondary">
          <CheckCheck size={15} />
          Mark read
        </Button>
      </header>
      <div className="notification-history-list">
        {notifications.map((notification) => {
          const Icon = notification.type.includes('disconnected') ? WifiOff : BellRing
          return (
            <article className="notification-history-item" key={notification.id}>
              <Icon size={17} />
              <div>
                <strong>{notification.title}</strong>
                <p>{notification.message}</p>
                <time>{formatTimestamp(notification.timestamp)}</time>
              </div>
              <span className={notification.dismissedAt ? 'history-state is-dismissed' : 'history-state'}>
                {notification.dismissedAt ? 'Dismissed' : 'Active'}
              </span>
            </article>
          )
        })}
      </div>
    </section>
  )
}
