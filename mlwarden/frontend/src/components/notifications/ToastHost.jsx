import { BellRing, WifiOff, X } from 'lucide-react'
import { useNotifications } from '../../app/useNotifications.js'
import { Button } from '../common/Button.jsx'
import { IconButton } from '../common/IconButton.jsx'

export function ToastHost() {
  const { activeToasts, dismissAllToasts, dismissNotification } = useNotifications()

  if (!activeToasts.length) {
    return null
  }

  return (
    <div className="toast-host" aria-live="polite">
      <div className="toast-actions">
        <Button onClick={dismissAllToasts} variant="secondary">Dismiss all</Button>
      </div>
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
  )
}
