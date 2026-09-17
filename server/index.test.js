import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createApiServer } from './index.js'

let server
let baseUrl

before(async () => {
  server = createApiServer()
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  baseUrl = `http://127.0.0.1:${address.port}`
})

after(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
})

test('health endpoint reports ready', async () => {
  const response = await fetch(`${baseUrl}/api/health`)
  const body = await response.json()

  assert.equal(response.status, 200)
  assert.equal(body.status, 'ok')
})

test('shelters endpoint filters by type and includes distance', async () => {
  const response = await fetch(`${baseUrl}/api/shelters?type=${encodeURIComponent('이동쉼터')}`)
  const body = await response.json()

  assert.equal(response.status, 200)
  assert.equal(body.items.length, 1)
  assert.equal(body.items[0].type, '이동쉼터')
  assert.equal(typeof body.items[0].distance, 'number')
})

test('support endpoint filters by category', async () => {
  const response = await fetch(`${baseUrl}/api/supports?category=${encodeURIComponent('주거')}`)
  const body = await response.json()

  assert.equal(response.status, 200)
  assert.ok(body.items.length > 0)
  assert.ok(body.items.every((item) => item.category === '주거'))
})

test('chat endpoint returns a safety action for danger messages', async () => {
  const response = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: '지금 위험해요' })
  })
  const body = await response.json()

  assert.equal(response.status, 200)
  assert.ok(body.actions.includes('call-112'))
})

test('chat endpoint rejects empty messages', async () => {
  const response = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: '  ' })
  })

  assert.equal(response.status, 400)
})
