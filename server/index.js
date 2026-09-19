import http from 'node:http'
import { pathToFileURL } from 'node:url'
import { shelters, supports } from '../src/data.js'

const DEFAULT_PORT = 8787
const DEFAULT_CENTER = { lat: 37.5665, lng: 126.978 }

function distanceKm(from, to) {
  const radius = 6371
  const lat = ((to.lat - from.lat) * Math.PI) / 180
  const lng = ((to.lng - from.lng) * Math.PI) / 180
  const a =
    Math.sin(lat / 2) ** 2 +
    Math.cos((from.lat * Math.PI) / 180) *
      Math.cos((to.lat * Math.PI) / 180) *
      Math.sin(lng / 2) ** 2

  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function numberInRange(value, minimum, maximum) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= minimum && parsed <= maximum ? parsed : null
}

function chatReply(message) {
  if (message.includes('위험')) {
    return {
      reply: '지금 당장 다칠 위험이 있다면 112에 전화해 주세요. 말하기 어렵다면 112 문자로 현재 위치와 상황을 보낼 수 있어요.',
      actions: ['call-112', 'find-shelter']
    }
  }
  if (message.includes('잘 곳') || message.includes('쉼터')) {
    return {
      reply: '오늘 머물 곳이 필요하군요. 위치를 켜거나 지역명만 알려주면 가까운 대피처를 찾을 수 있어요. 출발 전 1388로 입소 가능 여부를 확인해 주세요.',
      actions: ['find-shelter', 'call-1388']
    }
  }
  if (message.includes('돈') || message.includes('식사')) {
    return {
      reply: '당장 필요한 식사와 생활비 지원부터 확인해 볼게요. 자립지원 메뉴에 익명으로 확인할 수 있는 정보를 모아 두었어요.',
      actions: ['view-support']
    }
  }

  return {
    reply: '말해줘서 고마워요. 지금 가장 힘든 일부터 천천히 적어도 괜찮아요. 이 대화는 서버에 저장하지 않습니다.',
    actions: []
  }
}

function sendJson(response, status, payload) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  })
  response.end(JSON.stringify(payload))
}

async function readJson(request) {
  let body = ''
  for await (const chunk of request) {
    body += chunk
    if (body.length > 32_000) throw new Error('payload-too-large')
  }
  return body ? JSON.parse(body) : {}
}

export function createApiServer() {
  return http.createServer(async (request, response) => {
    const url = new URL(request.url, 'http://localhost')

    if (request.method === 'GET' && url.pathname === '/api/health') {
      sendJson(response, 200, { status: 'ok', service: 'helper-api' })
      return
    }

    if (request.method === 'GET' && url.pathname === '/api/shelters') {
      const lat = numberInRange(url.searchParams.get('lat'), -90, 90)
      const lng = numberInRange(url.searchParams.get('lng'), -180, 180)
      const origin = lat === null || lng === null ? DEFAULT_CENTER : { lat, lng }
      const gender = url.searchParams.get('gender')
      const type = url.searchParams.get('type')

      const items = shelters
        .filter((shelter) => !gender || gender === '전체' || shelter.gender === gender || shelter.gender === '누구나')
        .filter((shelter) => !type || type === '전체' || shelter.type === type)
        .map((shelter) => ({ ...shelter, distance: distanceKm(origin, shelter) }))
        .sort((a, b) => a.distance - b.distance)

      sendJson(response, 200, { items, source: 'demo', updatedAt: new Date().toISOString() })
      return
    }

    if (request.method === 'GET' && url.pathname === '/api/supports') {
      const category = url.searchParams.get('category')
      const items = !category || category === '전체'
        ? supports
        : supports.filter((support) => support.category === category)

      sendJson(response, 200, { items, source: 'demo' })
      return
    }

    if (request.method === 'POST' && url.pathname === '/api/chat') {
      try {
        const body = await readJson(request)
        const message = typeof body.message === 'string' ? body.message.trim().slice(0, 1000) : ''
        if (!message) {
          sendJson(response, 400, { error: 'message-required' })
          return
        }

        sendJson(response, 200, chatReply(message))
      } catch (error) {
        sendJson(response, error.message === 'payload-too-large' ? 413 : 400, { error: 'invalid-request' })
      }
      return
    }

    sendJson(response, 404, { error: 'not-found' })
  })
}

const isMainModule = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href

if (isMainModule) {
  const port = Number(process.env.PORT) || DEFAULT_PORT
  createApiServer().listen(port, '127.0.0.1', () => {
    console.log(`Haven API ready at http://127.0.0.1:${port}`)
  })
}
