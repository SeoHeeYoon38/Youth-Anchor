const REQUEST_TIMEOUT_MS = 5000

async function requestJson(path, options) {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(path, { ...options, signal: controller.signal })
    if (!response.ok) throw new Error(`request-failed-${response.status}`)
    return await response.json()
  } finally {
    window.clearTimeout(timeout)
  }
}

export async function fetchShelters(position) {
  const query = position
    ? `?lat=${encodeURIComponent(position.lat)}&lng=${encodeURIComponent(position.lng)}`
    : ''
  const response = await requestJson(`/api/shelters${query}`)
  return response.items
}

export async function fetchSupports() {
  const response = await requestJson('/api/supports')
  return response.items
}

export async function requestChatReply(message) {
  return requestJson('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message })
  })
}
