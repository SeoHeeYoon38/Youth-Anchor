import http from 'node:http'
import { randomBytes, randomUUID } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { extname, resolve, sep } from 'node:path'
import { pathToFileURL } from 'node:url'
import { WebSocketServer } from 'ws'
import { bearerToken, createGuestToken, verifyGuestToken } from './auth.js'
import { createChatService } from './ai-chat.js'
import { createDatabase } from './database.js'
import { syncNoticeFeeds } from './notice-sync.js'
import { createPushService } from './push.js'
import { ensureBaselineData, resolveOpenDataConfig, startSyncScheduler, syncAll } from './sync.js'

const DEFAULT_PORT = 8787
const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.woff2': 'font/woff2'
}

function distanceKm(from, to) {
  const radius = 6371
  const lat = ((to.lat - from.lat) * Math.PI) / 180
  const lng = ((to.lng - from.lng) * Math.PI) / 180
  const a = Math.sin(lat / 2) ** 2 + Math.cos((from.lat * Math.PI) / 180) * Math.cos((to.lat * Math.PI) / 180) * Math.sin(lng / 2) ** 2
  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function numberInRange(value, minimum, maximum) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= minimum && parsed <= maximum ? parsed : null
}

function sendJson(response, status, payload) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer'
  })
  response.end(JSON.stringify(payload))
}

function sendStatic(response, filePath, status = 200, requestMethod = 'GET') {
  const extension = extname(filePath)
  response.writeHead(status, {
    'Content-Type': MIME_TYPES[extension] || 'application/octet-stream',
    'Cache-Control': extension === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer'
  })
  if (requestMethod === 'HEAD') {
    response.end()
    return
  }
  createReadStream(filePath).pipe(response)
}

async function fileExists(filePath) {
  try {
    const info = await stat(filePath)
    return info.isFile()
  } catch {
    return false
  }
}

async function serveStaticApp({ request, response, url, staticDir }) {
  if (!staticDir || !['GET', 'HEAD'].includes(request.method)) return false

  const root = resolve(staticDir)
  let pathname
  try {
    pathname = decodeURIComponent(url.pathname)
  } catch {
    response.writeHead(400).end('Bad Request')
    return true
  }

  const requestedPath = pathname === '/' ? '/index.html' : pathname
  const filePath = resolve(root, `.${requestedPath}`)
  const insideRoot = filePath === root || filePath.startsWith(`${root}${sep}`)
  if (!insideRoot) {
    response.writeHead(403).end('Forbidden')
    return true
  }

  if (await fileExists(filePath)) {
    sendStatic(response, filePath, 200, request.method)
    return true
  }

  const hasExtension = Boolean(extname(requestedPath))
  const fallbackPath = resolve(root, 'index.html')
  if (!hasExtension && await fileExists(fallbackPath)) {
    sendStatic(response, fallbackPath, 200, request.method)
    return true
  }

  return false
}

async function readJson(request) {
  let body = ''
  for await (const chunk of request) {
    body += chunk
    if (body.length > 64_000) throw new Error('payload-too-large')
  }
  try {
    return body ? JSON.parse(body) : {}
  } catch {
    throw new Error('invalid-json')
  }
}

function validSubscription(body) {
  return Boolean(body?.subscription?.endpoint && body.subscription?.keys?.p256dh && body.subscription?.keys?.auth)
}

function adminAuthorized(request, adminKey) {
  return Boolean(adminKey && request.headers['x-admin-key'] === adminKey)
}

export function createApiServer(options = {}) {
  const configuredJwtSecret = options.jwtSecret || process.env.HAVEN_JWT_SECRET
  if (process.env.NODE_ENV === 'production' && !configuredJwtSecret) throw new Error('HAVEN_JWT_SECRET is required in production')
  const repository = options.repository || createDatabase(options.databasePath)
  const jwtSecret = configuredJwtSecret || randomBytes(32).toString('hex')
  const adminKey = options.adminKey || process.env.HAVEN_ADMIN_KEY || (process.env.NODE_ENV === 'production' ? '' : 'local-development-admin-key')
  const pushService = options.pushService || createPushService(repository, options.pushConfig)
  const openDataConfig = options.openDataConfig || resolveOpenDataConfig()
  const chatService = options.chatService || createChatService(options.openai)
  const staticDir = options.staticDir === false ? '' : options.staticDir || process.env.HAVEN_STATIC_DIR || 'dist'
  const socketsByRoom = new Map()

  function authenticate(request, response) {
    const guest = verifyGuestToken(bearerToken(request), repository, jwtSecret)
    if (!guest) sendJson(response, 401, { error: 'guest-token-required' })
    return guest
  }

  function verifyRoomOwner(roomId, guest) {
    const room = repository.getChatRoom(roomId)
    return room && room.guest_jti === guest.jti && Date.parse(room.expires_at) > Date.now() ? room : null
  }

  async function processChatMessage(room, message) {
    const clean = typeof message === 'string' ? message.trim().slice(0, 1000) : ''
    if (!clean) throw new Error('message-required')
    repository.activateChatRoom(room.id)
    const history = repository.listMessages(room.id, 6)
    repository.addMessage(room.id, 'user', clean)
    const answer = await chatService.reply({ message: clean, history })
    repository.addMessage(room.id, 'helper', answer.reply)
    return answer
  }

  const server = http.createServer(async (request, response) => {
    const url = new URL(request.url, 'http://localhost')

    try {
      if (request.method === 'GET' && (url.pathname === '/api/health' || url.pathname === '/api/v1/health')) {
        sendJson(response, 200, {
          status: 'ok',
          service: 'haven-api',
          database: 'sqlite',
          pushConfigured: Boolean(pushService.publicKey),
          ai: {
            provider: chatService.provider,
            configured: chatService.configured,
            model: chatService.model
          },
          openData: {
            shelters: openDataConfig.shelter.enabled,
            welfare: openDataConfig.welfare.enabled
          },
          counts: { shelters: repository.countShelters(), notices: repository.countNotices() },
          lastSync: repository.latestSyncRuns(),
          time: new Date().toISOString()
        })
        return
      }

      if (request.method === 'POST' && url.pathname === '/api/v1/auth/guest') {
        sendJson(response, 201, createGuestToken(repository, jwtSecret))
        return
      }

      if (url.pathname.startsWith('/api/v1/admin/')) {
        if (!adminAuthorized(request, adminKey)) {
          sendJson(response, 401, { error: 'admin-key-required' })
          return
        }

        if (request.method === 'POST' && url.pathname === '/api/v1/admin/notices') {
          const body = await readJson(request)
          if (!body.title) {
            sendJson(response, 400, { error: 'title-required' })
            return
          }
          sendJson(response, 201, repository.upsertNotice({ ...body, externalId: body.externalId || randomUUID(), sourceUrl: body.sourceUrl || 'admin' }))
          return
        }

        if (request.method === 'POST' && url.pathname === '/api/v1/admin/notices/sync') {
          sendJson(response, 200, await syncNoticeFeeds(repository, options.noticeFeedUrls))
          return
        }

        // 공공데이터포털 전체 동기화를 수동으로 돌린다. ?target=shelters|notices 로 범위를 좁힐 수 있다.
        if (request.method === 'POST' && url.pathname === '/api/v1/admin/sync') {
          const requested = url.searchParams.getAll('target').flatMap((value) => value.split(','))
          const allowed = ['shelters', 'notices']
          const targets = requested.filter((target) => allowed.includes(target))
          sendJson(response, 200, await syncAll({
            repository,
            config: openDataConfig,
            targets: targets.length > 0 ? targets : allowed
          }))
          return
        }

        if (request.method === 'GET' && url.pathname === '/api/v1/admin/sync/status') {
          sendJson(response, 200, {
            openData: {
              shelters: { enabled: openDataConfig.shelter.enabled, endpoint: openDataConfig.shelter.endpoint },
              welfare: { enabled: openDataConfig.welfare.enabled, endpoint: openDataConfig.welfare.listEndpoint }
            },
            schedule: { hourKst: openDataConfig.scheduleHourKst, minuteKst: openDataConfig.scheduleMinuteKst },
            counts: { shelters: repository.countShelters(), notices: repository.countNotices() },
            runs: repository.latestSyncRuns()
          })
          return
        }

        if (request.method === 'POST' && url.pathname === '/api/v1/admin/shelters') {
          const body = await readJson(request)
          const lat = numberInRange(body.lat, -90, 90)
          const lng = numberInRange(body.lng, -180, 180)
          if (!body.name || !body.type || !body.address || lat === null || lng === null) {
            sendJson(response, 400, { error: 'invalid-shelter' })
            return
          }
          sendJson(response, 201, repository.createShelter({ ...body, lat, lng }))
          return
        }

        sendJson(response, 404, { error: 'not-found' })
        return
      }

      if (!url.pathname.startsWith('/api/')) {
        if (await serveStaticApp({ request, response, url, staticDir })) return
        sendJson(response, 404, { error: 'not-found' })
        return
      }

      if (!url.pathname.startsWith('/api/v1/')) {
        sendJson(response, 404, { error: 'not-found' })
        return
      }

      const guest = authenticate(request, response)
      if (!guest) return

      if (request.method === 'GET' && url.pathname === '/api/v1/notices') {
        const parsedLimit = Number(url.searchParams.get('limit') || 50)
        const parsedOffset = Number(url.searchParams.get('offset') || 0)
        const limit = Number.isInteger(parsedLimit) && parsedLimit >= 1 && parsedLimit <= 100 ? parsedLimit : 50
        const offset = Number.isInteger(parsedOffset) && parsedOffset >= 0 ? parsedOffset : 0
        const items = repository.listNotices({
          category: url.searchParams.get('category'),
          kind: url.searchParams.get('kind'),
          limit,
          offset
        })
        sendJson(response, 200, { items, limit, offset })
        return
      }

      const noticeMatch = url.pathname.match(/^\/api\/v1\/notices\/(\d+)$/)
      if (request.method === 'GET' && noticeMatch) {
        const notice = repository.getNotice(Number(noticeMatch[1]))
        sendJson(response, notice ? 200 : 404, notice || { error: 'notice-not-found' })
        return
      }

      if (request.method === 'GET' && url.pathname === '/api/v1/shelters/nearby') {
        const lat = numberInRange(url.searchParams.get('lat'), -90, 90)
        const lng = numberInRange(url.searchParams.get('lng'), -180, 180)
        const radiusKm = numberInRange(url.searchParams.get('radiusKm') || 10, 0.1, 50)
        if (lat === null || lng === null || radiusKm === null) {
          sendJson(response, 400, { error: 'valid-coordinates-required' })
          return
        }
        const origin = { lat, lng }
        const gender = url.searchParams.get('gender')
        const type = url.searchParams.get('type')
        const items = repository.listShelters()
          .filter((shelter) => !gender || gender === '전체' || shelter.gender === gender || shelter.gender === '누구나')
          .filter((shelter) => !type || type === '전체' || shelter.type === type)
          .map((shelter) => ({ ...shelter, distance: distanceKm(origin, shelter) }))
          .filter((shelter) => shelter.distance <= radiusKm)
          .sort((a, b) => a.distance - b.distance)
        sendJson(response, 200, { items, radiusKm, updatedAt: new Date().toISOString() })
        return
      }

      const shelterMatch = url.pathname.match(/^\/api\/v1\/shelters\/(\d+)$/)
      if (request.method === 'GET' && shelterMatch) {
        const shelter = repository.getShelter(Number(shelterMatch[1]))
        sendJson(response, shelter ? 200 : 404, shelter || { error: 'shelter-not-found' })
        return
      }

      if (request.method === 'POST' && url.pathname === '/api/v1/chat/rooms') {
        const now = new Date()
        const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000)
        const id = randomUUID()
        repository.createChatRoom(id, guest.jti, now.toISOString(), expiresAt.toISOString())
        sendJson(response, 201, { id, status: 'waiting', expiresAt: expiresAt.toISOString(), socketPath: `/api/v1/chat/rooms/${id}/socket` })
        return
      }

      const messageMatch = url.pathname.match(/^\/api\/v1\/chat\/rooms\/([0-9a-f-]+)\/messages$/i)
      if (request.method === 'POST' && messageMatch) {
        const room = verifyRoomOwner(messageMatch[1], guest)
        if (!room) {
          sendJson(response, 404, { error: 'chat-room-not-found' })
          return
        }
        const body = await readJson(request)
        sendJson(response, 200, await processChatMessage(room, body.message))
        return
      }

      const deleteRoomMatch = url.pathname.match(/^\/api\/v1\/chat\/rooms\/([0-9a-f-]+)$/i)
      if (request.method === 'DELETE' && deleteRoomMatch) {
        const roomId = deleteRoomMatch[1]
        const deleted = repository.deleteChatRoom(roomId, guest.jti)
        if (deleted) {
          for (const socket of socketsByRoom.get(roomId) || []) socket.close(1000, 'room-deleted')
          socketsByRoom.delete(roomId)
        }
        sendJson(response, deleted ? 200 : 404, deleted ? { deleted: true } : { error: 'chat-room-not-found' })
        return
      }

      if (request.method === 'POST' && url.pathname === '/api/v1/sos/alerts') {
        const body = await readJson(request)
        const lat = numberInRange(body.lat, -90, 90)
        const lng = numberInRange(body.lng, -180, 180)
        if (lat === null || lng === null) {
          sendJson(response, 400, { error: 'valid-coordinates-required' })
          return
        }
        if (body.roomId && !verifyRoomOwner(body.roomId, guest)) {
          sendJson(response, 404, { error: 'chat-room-not-found' })
          return
        }
        const alert = repository.createSos({
          id: randomUUID(),
          guestJti: guest.jti,
          roomId: body.roomId || null,
          lat,
          lng,
          message: typeof body.message === 'string' ? body.message.slice(0, 500) : '',
          createdAt: new Date().toISOString()
        })
        const delivery = await pushService.sendToAudience('admin', { type: 'sos', alertId: alert.id, lat, lng, createdAt: alert.createdAt })
        sendJson(response, 202, { id: alert.id, status: 'received', delivery })
        return
      }

      if (request.method === 'POST' && url.pathname === '/api/v1/notifications/subscribe') {
        const body = await readJson(request)
        if (!validSubscription(body)) {
          sendJson(response, 400, { error: 'invalid-push-subscription' })
          return
        }
        const requestedAudience = body.audience === 'admin' ? 'admin' : 'guest'
        if (requestedAudience === 'admin' && !adminAuthorized(request, adminKey)) {
          sendJson(response, 403, { error: 'admin-key-required' })
          return
        }
        repository.upsertSubscription({ ...body.subscription, guestJti: guest.jti, audience: requestedAudience })
        sendJson(response, 201, { subscribed: true, vapidPublicKey: pushService.publicKey })
        return
      }

      if (request.method === 'GET' && url.pathname === '/api/v1/notifications/config') {
        sendJson(response, 200, { configured: Boolean(pushService.publicKey), vapidPublicKey: pushService.publicKey })
        return
      }

      sendJson(response, 404, { error: 'not-found' })
    } catch (error) {
      const status = error.message === 'payload-too-large' ? 413 : error.message === 'message-required' || error.message === 'invalid-json' ? 400 : 500
      sendJson(response, status, { error: status === 500 ? 'internal-error' : error.message })
    }
  })

  const websocketServer = new WebSocketServer({ noServer: true })
  server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url, 'http://localhost')
    const match = url.pathname.match(/^\/api\/v1\/chat\/rooms\/([0-9a-f-]+)\/socket$/i)
    const guest = verifyGuestToken(url.searchParams.get('token'), repository, jwtSecret)
    const room = match && guest ? verifyRoomOwner(match[1], guest) : null
    if (!room) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n')
      socket.destroy()
      return
    }

    websocketServer.handleUpgrade(request, socket, head, (websocket) => {
      websocket.room = room
      websocketServer.emit('connection', websocket)
    })
  })

  websocketServer.on('connection', (socket) => {
    const { room } = socket
    const roomSockets = socketsByRoom.get(room.id) || new Set()
    roomSockets.add(socket)
    socketsByRoom.set(room.id, roomSockets)
    socket.send(JSON.stringify({ type: 'ready', roomId: room.id }))

    socket.on('message', async (raw) => {
      try {
        const payload = JSON.parse(raw.toString())
        if (payload.type !== 'message') return
        const answer = await processChatMessage(room, payload.text)
        socket.send(JSON.stringify({ type: 'reply', ...answer }))
      } catch (error) {
        socket.send(JSON.stringify({ type: 'error', error: error.message === 'message-required' ? error.message : 'invalid-message' }))
      }
    })

    socket.on('close', () => {
      roomSockets.delete(socket)
      if (roomSockets.size === 0) socketsByRoom.delete(room.id)
    })
  })

  const cleanupTimer = options.disableJobs ? null : setInterval(() => repository.purgeExpired(), 60 * 60 * 1000)
  cleanupTimer?.unref()

  if (!options.disableJobs) {
    // 첫 실행부터 전국 쉼터가 보이도록 동봉 데이터를 넣고, 키가 있으면 오픈API로 갱신한다.
    ensureBaselineData({ repository }).catch(() => {})
    const scheduler = startSyncScheduler({
      repository,
      config: { ...openDataConfig, noticeFeedUrls: options.noticeFeedUrls || openDataConfig.noticeFeedUrls }
    })
    server.on('close', () => scheduler.stop())
  }

  server.on('close', () => {
    if (cleanupTimer) clearInterval(cleanupTimer)
    websocketServer.close()
    if (!options.repository) repository.close()
  })
  server.repository = repository
  return server
}

const isMainModule = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href

if (isMainModule) {
  const port = Number(process.env.PORT) || DEFAULT_PORT
  const host = process.env.HOST || '0.0.0.0'
  createApiServer().listen(port, host, () => {
    console.log(`Haven app ready at http://${host}:${port}`)
  })
}
