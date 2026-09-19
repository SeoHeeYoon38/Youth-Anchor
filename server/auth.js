import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto'

const TOKEN_TTL_SECONDS = 24 * 60 * 60

function base64url(value) {
  return Buffer.from(value).toString('base64url')
}

function sign(unsignedToken, secret) {
  return createHmac('sha256', secret).update(unsignedToken).digest('base64url')
}

export function createGuestToken(repository, secret) {
  const now = Math.floor(Date.now() / 1000)
  const jti = randomUUID()
  const payload = { sub: 'guest', jti, iat: now, exp: now + TOKEN_TTL_SECONDS }
  const unsignedToken = `${base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))}.${base64url(JSON.stringify(payload))}`
  const token = `${unsignedToken}.${sign(unsignedToken, secret)}`
  repository.createGuest(jti, new Date(now * 1000).toISOString(), new Date(payload.exp * 1000).toISOString())
  return { token, expiresAt: new Date(payload.exp * 1000).toISOString() }
}

export function verifyGuestToken(token, repository, secret) {
  if (!token) return null
  const parts = token.split('.')
  if (parts.length !== 3) return null

  const [header, payloadPart, signature] = parts
  const expected = sign(`${header}.${payloadPart}`, secret)
  const actualBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expected)
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) return null

  try {
    const payload = JSON.parse(Buffer.from(payloadPart, 'base64url').toString('utf8'))
    if (payload.sub !== 'guest' || !payload.jti || payload.exp <= Math.floor(Date.now() / 1000)) return null
    const session = repository.getGuest(payload.jti)
    if (!session || session.revoked_at || Date.parse(session.expires_at) <= Date.now()) return null
    return payload
  } catch {
    return null
  }
}

export function bearerToken(request) {
  const authorization = request.headers.authorization || ''
  return authorization.startsWith('Bearer ') ? authorization.slice(7) : ''
}
