import { BellRing, WifiOff } from 'lucide-react'
import { notifications } from '../../mockData.js'

export function ToastHost() {
  return (
    <div className="toast-host" aria-live="polite">
      {notifications.map((toast) => {
        const Icon = toast.type.includes('disconnected') ? WifiOff : BellRing
        return (
          <article className="toast" key={toast.id}>
            <Icon size={16} />
            <div>
              <strong>{toast.title}</strong>
              <p>{toast.message}</p>
            </div>
          </article>
        )
      })}
    </div>
  )
}
