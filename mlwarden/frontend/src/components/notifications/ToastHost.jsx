import { BellRing, WifiOff, X } from 'lucide-react'
import { useEffect } from 'react'
import { useNotifications } from '@/app/useNotifications.js'
import { Button } from '@/components/common/Button.jsx'
import { IconButton } from '@/components/common/IconButton.jsx'

export function ToastHost() {
  const { activeToasts, dismissAllToasts, dismissNotification } = useNotifications()

  useEffect(() => {
    const timers = activeToasts.map((toast) =>
      window.setTimeout(() => dismissNotification(toast.id), 10000),
    )
    return () => timers.forEach((timer) => window.clearTimeout(timer))
  }, [activeToasts, dismissNotification])

  if (!activeToasts.length) {
    return null
  }

  return (
    <div className="toast-host" aria-live="polite">
      {activeToasts.length > 1 ? (
        <div className="toast-actions">
          <Button onClick={dismissAllToasts} size="sm" variant="secondary">Dismiss all</Button>
        </div>
      ) : null}
      <div className="toast-list">
        {activeToasts.map((toast) => {
          const Icon = toast.type.includes('disconnected') ? WifiOff : BellRing
          return (
            <article className="toast" key={toast.id}>
              <Icon size={16} />
              <div>
                <strong>{toast.title}</strong>
                <p>{toast.message}</p>
              </div>
              <IconButton label={`Dismiss ${toast.title}`} icon={X} onClick={() => dismissNotification(toast.id)} />
            </article>
          )
        })}
      </div>
    </div>
  )
}
