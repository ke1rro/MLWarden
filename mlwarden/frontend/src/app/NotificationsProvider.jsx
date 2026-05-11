import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react'
import { eventToNotification } from '@/api/adapters.js'
import { listRecentEvents } from '@/api/events.js'
import { createWebSocketConnection } from '@/api/websocket.js'
import { useAuth } from '@/app/useAuth.js'
import { NotificationsContext } from './notificationsContext.js'

const NOTIFICATIONS_STORAGE_KEY = 'mlwarden.notifications.v2'
const TOAST_EVENT_TYPES = new Set([
  'run.finished',
  'run.failed',
  'run.cancelled',
  'artifact.uploaded',
  'image.uploaded',
  'backend.disconnected',
  'backend.connected',
])

function createInitialNotifications() {
  return []
}

function readStoredNotifications() {
  try {
    const stored = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY)
    if (!stored) return createInitialNotifications()

    const parsed = JSON.parse(stored)
    return Array.isArray(parsed) && parsed.length ? parsed : createInitialNotifications()
  } catch {
    return createInitialNotifications()
  }
}

function notificationReducer(state, action) {
  if (action.type === 'replace') {
    return action.notifications
  }

  if (action.type === 'add') {
    const exists = state.some((notification) => notification.id === action.notification.id)
    const next = exists
      ? state.map((notification) => (notification.id === action.notification.id ? { ...notification, ...action.notification } : notification))
      : [action.notification, ...state]
    return next.slice(0, 100)
  }

  if (action.type === 'dismiss') {
    const timestamp = new Date().toISOString()
    return state.map((notification) =>
      notification.id === action.id
        ? { ...notification, dismissedAt: notification.dismissedAt || timestamp, readAt: notification.readAt || timestamp }
        : notification,
    )
  }

  if (action.type === 'dismiss_all') {
    const timestamp = new Date().toISOString()
    return state.map((notification) => ({
      ...notification,
      dismissedAt: notification.dismissedAt || timestamp,
      readAt: notification.readAt || timestamp,
    }))
  }

  if (action.type === 'mark_all_read') {
    const timestamp = new Date().toISOString()
    return state.map((notification) => ({
      ...notification,
      readAt: notification.readAt || timestamp,
    }))
  }

  return state
}

export function NotificationsProvider({ children }) {
  const { isAuthenticated, token } = useAuth()
  const [notifications, dispatch] = useReducer(notificationReducer, undefined, readStoredNotifications)
  const subscribers = useRef(new Set())
  const connection = useRef(null)
  const wasDisconnected = useRef(false)

  useEffect(() => {
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifications))
  }, [notifications])

  const publish = useCallback((message) => {
    subscribers.current.forEach((callback) => callback(message))
  }, [])

  useEffect(() => {
    if (!isAuthenticated) {
      connection.current?.stop()
      connection.current = null
      return undefined
    }

    let cancelled = false
    listRecentEvents({ limit: 25 })
      .then((response) => {
        if (cancelled) return
        const recent = (response.items || [])
          .filter((event) => TOAST_EVENT_TYPES.has(event.type))
          .map(eventToNotification)
        dispatch({ type: 'replace', notifications: recent })
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [isAuthenticated])

  useEffect(() => {
    if (!isAuthenticated || !token) return undefined

    connection.current?.stop()
    connection.current = createWebSocketConnection({
      onOpen() {
        if (wasDisconnected.current) {
          const message = {
            type: 'backend.connected',
            timestamp: new Date().toISOString(),
            payload: { message: 'Backend connection restored.' },
          }
          dispatch({ type: 'add', notification: eventToNotification(message) })
          publish(message)
        }
        wasDisconnected.current = false
      },
      onClose() {
        if (!wasDisconnected.current) {
          const message = {
            type: 'backend.disconnected',
            timestamp: new Date().toISOString(),
            payload: { message: 'Backend connection lost. Reconnecting...' },
          }
          dispatch({ type: 'add', notification: eventToNotification(message) })
          publish(message)
        }
        wasDisconnected.current = true
      },
      onMessage(message) {
        if (TOAST_EVENT_TYPES.has(message.type)) {
          dispatch({ type: 'add', notification: eventToNotification(message) })
        }
        publish(message)
      },
    })

    return () => {
      connection.current?.stop()
      connection.current = null
    }
  }, [isAuthenticated, publish, token])

  const subscribe = useCallback((callback) => {
    subscribers.current.add(callback)
    return () => subscribers.current.delete(callback)
  }, [])

  const value = useMemo(
    () => ({
      notifications,
      activeToasts: notifications.filter((notification) => !notification.dismissedAt),
      unreadCount: notifications.filter((notification) => !notification.readAt).length,
      dismissNotification(id) {
        dispatch({ type: 'dismiss', id })
      },
      dismissAllToasts() {
        dispatch({ type: 'dismiss_all' })
      },
      markAllRead() {
        dispatch({ type: 'mark_all_read' })
      },
      subscribe,
    }),
    [notifications, subscribe],
  )

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
}
