import { useEffect, useMemo, useReducer } from 'react'
import { trackerApi } from '@/api/TrackerApi.js'
import { NotificationsContext } from './notificationsContext.js'

const NOTIFICATIONS_STORAGE_KEY = 'mlwarden.notifications'

function createInitialNotifications() {
  return trackerApi.listNotifications().map((notification) => ({
    ...notification,
    readAt: null,
    dismissedAt: null,
  }))
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
  const [notifications, dispatch] = useReducer(notificationReducer, undefined, readStoredNotifications)

  useEffect(() => {
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifications))
  }, [notifications])

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
    }),
    [notifications],
  )

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
}
