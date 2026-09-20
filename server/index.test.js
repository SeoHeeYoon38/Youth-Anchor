import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import WebSocket from 'ws'
import { createApiServer } from './index.js'

let server
let baseUrl
let socketUrl
let guestToken

const adminHeaders = {
  'Content-Type': 'application/json',
  'x-admin-key': 'test-admin-key'
}

function authHeaders(extra = {}) {
  return { Authorization: `Bearer ${guestToken}`, ...extra }
}

before(async () => {
  server = createApiServer({
    databasePath: ':memory:',
    jwtSecret: 'test-jwt-secret-that-is-long-enough',
    adminKey: 'test-admin-key',
    disableJobs: true,
    pushService: {
      publicKey: null,
      sendToAudience: async () => ({ configured: false, delivered: 0, failed: 0 })
    }
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  baseUrl = `http://127.0.0.1:${address.port}`
  socketUrl = `ws://127.0.0.1:${address.port}`

  const response = await fetch(`${baseUrl}/api/v1/auth/guest`, { method: 'POST' })
  const session = await response.json()
  guestToken = session.token
})

after(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
})

test('health endpoint reports persistent service dependencies', async () => {
  const response = await fetch(`${baseUrl}/api/v1/health`)
  const body = await response.json()
  assert.equal(response.status, 200)
  assert.equal(body.status, 'ok')
  assert.equal(body.database, 'sqlite')
  assert.equal(body.ai.provider, 'openai')
  assert.equal(body.ai.configured, false)
})

test('guest token is required for v1 data endpoints', async () => {
  const response = await fetch(`${baseUrl}/api/v1/notices`)
  assert.equal(response.status, 401)
})

test('admin can register a shelter and nearby search returns location details', async () => {
  const createResponse = await fetch(`${baseUrl}/api/v1/admin/shelters`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      name: '테스트 청소년쉼터',
      type: '일시쉼터',
      gender: '누구나',
      ages: '9~24세',
      lat: 37.5668,
      lng: 126.9787,
      address: '서울 중구',
      phone: '1388',
      open: '24시간',
      features: ['숙박', '식사']
    })
  })
  const created = await createResponse.json()
  assert.equal(createResponse.status, 201)

  const nearbyResponse = await fetch(`${baseUrl}/api/v1/shelters/nearby?lat=37.5665&lng=126.978&radiusKm=5`, {
    headers: authHeaders()
  })
  const nearby = await nearbyResponse.json()
  assert.equal(nearbyResponse.status, 200)
  assert.equal(nearby.items.length, 1)
  assert.equal(typeof nearby.items[0].distance, 'number')
  assert.equal('capacity' in nearby.items[0], false)

  const detailResponse = await fetch(`${baseUrl}/api/v1/shelters/${created.id}`, { headers: authHeaders() })
  assert.equal(detailResponse.status, 200)
})

test('notice list and detail are backed by sqlite', async () => {
  const createResponse = await fetch(`${baseUrl}/api/v1/admin/notices`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      kind: 'support',
      category: '식사',
      title: '식사 지원 신청',
      summary: '주중 식사 지원',
      content: '신청 기관에 문의해 주세요.',
      provider: '테스트 기관',
      tags: ['청소년']
    })
  })
  const created = await createResponse.json()
  assert.equal(createResponse.status, 201)

  const listResponse = await fetch(`${baseUrl}/api/v1/notices?kind=support&category=${encodeURIComponent('식사')}`, { headers: authHeaders() })
  const list = await listResponse.json()
  assert.equal(list.items.length, 1)

  const detailResponse = await fetch(`${baseUrl}/api/v1/notices/${created.id}`, { headers: authHeaders() })
  const detail = await detailResponse.json()
  assert.equal(detail.title, '식사 지원 신청')
})

test('chat room supports HTTP messages and permanent deletion', async () => {
  const roomResponse = await fetch(`${baseUrl}/api/v1/chat/rooms`, { method: 'POST', headers: authHeaders() })
  const room = await roomResponse.json()
  assert.equal(roomResponse.status, 201)

  const messageResponse = await fetch(`${baseUrl}/api/v1/chat/rooms/${room.id}/messages`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ message: '돈과 식사가 필요해요' })
  })
  const reply = await messageResponse.json()
  assert.ok(reply.actions.includes('view-support'))

  const deleteResponse = await fetch(`${baseUrl}/api/v1/chat/rooms/${room.id}`, { method: 'DELETE', headers: authHeaders() })
  assert.equal(deleteResponse.status, 200)

  const afterDelete = await fetch(`${baseUrl}/api/v1/chat/rooms/${room.id}/messages`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ message: '다시 보내기' })
  })
  assert.equal(afterDelete.status, 404)
})

test('chat room accepts authenticated websocket messages', async () => {
  const roomResponse = await fetch(`${baseUrl}/api/v1/chat/rooms`, { method: 'POST', headers: authHeaders() })
  const room = await roomResponse.json()
  const socket = new WebSocket(`${socketUrl}${room.socketPath}?token=${encodeURIComponent(guestToken)}`)

  const messages = await new Promise((resolve, reject) => {
    const received = []
    const timeout = setTimeout(() => reject(new Error('websocket-timeout')), 3000)
    socket.on('message', (raw) => {
      const payload = JSON.parse(raw.toString())
      received.push(payload)
      if (payload.type === 'ready') socket.send(JSON.stringify({ type: 'message', text: '오늘 잘 곳이 없어요' }))
      if (payload.type === 'reply') {
        clearTimeout(timeout)
        resolve(received)
      }
    })
    socket.on('error', reject)
  })
  socket.close()
  assert.equal(messages[0].type, 'ready')
  assert.ok(messages[1].actions.includes('find-shelter'))
})

test('SOS accepts coordinates and reports push delivery state', async () => {
  const response = await fetch(`${baseUrl}/api/v1/sos/alerts`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ lat: 37.5665, lng: 126.978, message: '긴급 도움 요청' })
  })
  const body = await response.json()
  assert.equal(response.status, 202)
  assert.equal(body.status, 'received')
  assert.equal(body.delivery.configured, false)
})

test('push subscription is validated and stored', async () => {
  const response = await fetch(`${baseUrl}/api/v1/notifications/subscribe`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      subscription: {
        endpoint: 'https://push.example.test/subscription',
        keys: { p256dh: 'test-p256dh', auth: 'test-auth' }
      }
    })
  })
  assert.equal(response.status, 201)
})

test('admin push subscription requires the admin key', async () => {
  const denied = await fetch(`${baseUrl}/api/v1/notifications/subscribe`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      audience: 'admin',
      subscription: {
        endpoint: 'https://push.example.test/admin-denied',
        keys: { p256dh: 'test-p256dh', auth: 'test-auth' }
      }
    })
  })
  assert.equal(denied.status, 403)

  const accepted = await fetch(`${baseUrl}/api/v1/notifications/subscribe`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json', 'x-admin-key': 'test-admin-key' }),
    body: JSON.stringify({
      audience: 'admin',
      subscription: {
        endpoint: 'https://push.example.test/admin-accepted',
        keys: { p256dh: 'test-p256dh', auth: 'test-auth' }
      }
    })
  })
  assert.equal(accepted.status, 201)
})
