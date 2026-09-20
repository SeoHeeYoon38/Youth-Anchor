const REQUEST_TIMEOUT_MS = 8000
const SESSION_KEY = 'haven.guest-session'

function readSession() {
  try {
    const session = JSON.parse(localStorage.getItem(SESSION_KEY))
    return session?.token && Date.parse(session.expiresAt) > Date.now() + 30_000 ? session : null
  } catch {
    return null
  }
}

export async function ensureGuestSession(force = false) {
  if (!force) {
    const stored = readSession()
    if (stored) return stored
  }

  const response = await fetch('/api/v1/auth/guest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}'
  })
  if (!response.ok) throw new Error(`guest-session-failed-${response.status}`)
  const session = await response.json()
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  return session
}

async function requestJson(path, options = {}, retry = true) {
  const session = await ensureGuestSession()
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  const headers = new Headers(options.headers || {})
  headers.set('Authorization', `Bearer ${session.token}`)
  if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')

  try {
    const response = await fetch(path, { ...options, headers, signal: controller.signal })
    if (response.status === 401 && retry) {
      localStorage.removeItem(SESSION_KEY)
      await ensureGuestSession(true)
      return requestJson(path, options, false)
    }
    if (!response.ok) {
      const detail = await response.json().catch(() => ({}))
      throw new Error(detail.error || `request-failed-${response.status}`)
    }
    return response.status === 204 ? null : response.json()
  } finally {
    window.clearTimeout(timeout)
  }
}

export async function fetchShelters(position, filters = {}) {
  const query = new URLSearchParams({
    lat: String(position.lat),
    lng: String(position.lng),
    radiusKm: String(filters.radiusKm || 10)
  })
  if (filters.gender && filters.gender !== '전체') query.set('gender', filters.gender)
  if (filters.type && filters.type !== '전체') query.set('type', filters.type)
  const response = await requestJson(`/api/v1/shelters/nearby?${query}`)
  return response.items
}

export async function fetchShelter(id) {
  return requestJson(`/api/v1/shelters/${id}`)
}

export async function fetchNotices(filters = {}) {
  const query = new URLSearchParams({ limit: '100' })
  if (filters.category && filters.category !== '전체') query.set('category', filters.category)
  if (filters.kind) query.set('kind', filters.kind)
  const response = await requestJson(`/api/v1/notices?${query}`)
  return response.items.map((notice) => ({ ...notice, body: notice.summary || notice.content }))
}

export async function fetchNotice(id) {
  return requestJson(`/api/v1/notices/${id}`)
}

export async function createChatRoom() {
  return requestJson('/api/v1/chat/rooms', { method: 'POST', body: '{}' })
}

export async function requestChatReply(roomId, message) {
  return requestJson(`/api/v1/chat/rooms/${roomId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ message })
  })
}

export async function connectChatRoom(roomId, handlers = {}) {
  const session = await ensureGuestSession()
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(`${protocol}//${window.location.host}/api/v1/chat/rooms/${roomId}/socket?token=${encodeURIComponent(session.token)}`)
    let connected = false
    socket.addEventListener('message', (event) => {
      try {
        const payload = JSON.parse(event.data)
        if (payload.type === 'reply') handlers.onReply?.(payload)
        if (payload.type === 'error') handlers.onError?.(new Error(payload.error))
        if (payload.type === 'ready') {
          connected = true
          handlers.onReady?.()
          resolve(socket)
        }
      } catch {
        handlers.onError?.(new Error('invalid-socket-message'))
      }
    })
    socket.addEventListener('close', () => handlers.onClose?.())
    socket.addEventListener('error', () => {
      const error = new Error('socket-error')
      handlers.onError?.(error)
      if (!connected) reject(error)
    })
  })
}

export async function deleteChatRoom(roomId) {
  if (!roomId) return
  await requestJson(`/api/v1/chat/rooms/${roomId}`, { method: 'DELETE' })
}

export async function createSosAlert({ position, roomId, message }) {
  return requestJson('/api/v1/sos/alerts', {
    method: 'POST',
    body: JSON.stringify({ lat: position.lat, lng: position.lng, roomId, message })
  })
}

export async function subscribeToPush(subscription, audience = 'guest') {
  return requestJson('/api/v1/notifications/subscribe', {
    method: 'POST',
    body: JSON.stringify({ subscription: subscription.toJSON?.() || subscription, audience })
  })
}

function urlBase64ToUint8Array(value) {
  const padding = '='.repeat((4 - (value.length % 4)) % 4)
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(base64)
  return Uint8Array.from([...raw].map((character) => character.charCodeAt(0)))
}

export async function enablePushNotifications() {
  if (!('Notification' in window) || !('serviceWorker' in navigator)) throw new Error('push-not-supported')
  const config = await requestJson('/api/v1/notifications/config')
  if (!config.configured || !config.vapidPublicKey) throw new Error('push-not-configured')
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('push-permission-denied')
  const registration = await navigator.serviceWorker.ready
  const existing = await registration.pushManager.getSubscription()
  const subscription = existing || await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(config.vapidPublicKey)
  })
  await subscribeToPush(subscription)
  return true
}
