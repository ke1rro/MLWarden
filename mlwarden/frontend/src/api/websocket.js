import { getAccessToken, WS_BASE_URL } from '@/api/client.js'

export function createWebSocketConnection({ onOpen, onClose, onMessage }) {
  let socket = null
  let reconnectTimer = null
  let reconnectAttempt = 0
  let stopped = false

  function clearReconnect() {
    if (reconnectTimer) {
      window.clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
  }

  function scheduleReconnect() {
    if (stopped) return
    const delay = Math.min(30000, 1000 * 2 ** reconnectAttempt)
    reconnectAttempt += 1
    clearReconnect()
    reconnectTimer = window.setTimeout(connect, delay)
  }

  function connect() {
    const token = getAccessToken()
    if (!token || stopped) return

    socket = new WebSocket(`${WS_BASE_URL}/api/ws?token=${encodeURIComponent(token)}`)

    socket.addEventListener('open', () => {
      reconnectAttempt = 0
      onOpen?.()
    })

    socket.addEventListener('message', (event) => {
      try {
        onMessage?.(JSON.parse(event.data))
      } catch {
        onMessage?.({ type: 'unknown', payload: { raw: event.data } })
      }
    })

    socket.addEventListener('close', () => {
      socket = null
      if (stopped) return
      onClose?.()
      scheduleReconnect()
    })

    socket.addEventListener('error', () => {
      socket?.close()
    })
  }

  function stop() {
    stopped = true
    clearReconnect()
    if (socket) {
      socket.close()
      socket = null
    }
  }

  connect()

  return { stop }
}
