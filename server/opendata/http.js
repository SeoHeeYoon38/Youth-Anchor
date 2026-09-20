import { parseXml } from './xml.js'

const DEFAULT_TIMEOUT_MS = 15_000
const DEFAULT_RETRIES = 2
const RETRY_DELAY_MS = 700

/**
 * 공공데이터포털이 인증·쿼터 문제를 알릴 때 쓰는 returnReasonCode 모음.
 * 이 코드가 오면 재시도해도 결과가 같으므로 즉시 중단하고 사람이 조치해야 한다.
 */
const FATAL_REASON_CODES = new Map([
  ['01', 'APPLICATION_ERROR: 제공기관 서비스에 일시적 오류가 있습니다.'],
  ['04', 'HTTP_ERROR: 요청 형식을 확인하세요.'],
  ['12', 'NO_OPENAPI_SERVICE_ERROR: 해당 오픈API가 없거나 폐기되었습니다. 엔드포인트를 확인하세요.'],
  ['20', 'SERVICE_ACCESS_DENIED_ERROR: 활용신청이 승인되지 않았습니다.'],
  ['22', 'LIMITED_NUMBER_OF_SERVICE_REQUESTS_EXCEEDS_ERROR: 일일 트래픽을 초과했습니다.'],
  ['30', 'SERVICE_KEY_IS_NOT_REGISTERED_ERROR: 서비스키가 등록되지 않았습니다. 승인 후 최대 1시간 정도 걸릴 수 있습니다.'],
  ['31', 'DEADLINE_HAS_EXPIRED_ERROR: 활용기간이 만료되었습니다.'],
  ['32', 'UNREGISTERED_IP_ERROR: 등록되지 않은 IP입니다.'],
  ['33', 'UNSIGNED_CALL_ERROR: 서명되지 않은 호출입니다.']
])

/** 공공데이터포털 오류. `fatal`이 true면 재시도가 무의미하다. */
export class OpenDataError extends Error {
  constructor(message, { code = null, fatal = false, status = null } = {}) {
    super(message)
    this.name = 'OpenDataError'
    this.code = code
    this.fatal = fatal
    this.status = status
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * 공공데이터포털은 인증 실패를 본문으로만 알리는 경우가 많다(HTTP 200 + 오류 XML).
 * JSON/XML 어느 포맷이든 공통 래퍼를 찾아 오류를 승격시킨다.
 */
function assertNoServiceError(payload) {
  const wrapper = payload?.OpenAPI_ServiceResponse?.cmmMsgHeader || payload?.cmmMsgHeader
  if (wrapper) {
    const code = String(wrapper.returnReasonCode ?? '')
    const detail = FATAL_REASON_CODES.get(code)
    throw new OpenDataError(
      detail || wrapper.errMsg || wrapper.returnAuthMsg || '공공데이터포털 오류 응답',
      { code, fatal: FATAL_REASON_CODES.has(code) }
    )
  }

  const header = payload?.response?.header || payload?.header
  if (header) {
    const code = String(header.resultCode ?? '')
    // 성평등가족부/표준 REST 서비스는 '00' 또는 '0'을 정상으로 쓴다.
    if (code && code !== '00' && code !== '0' && code !== '200') {
      throw new OpenDataError(header.resultMsg || `resultCode=${code}`, { code, fatal: code === '30' })
    }
  }

  const welfare = payload?.wantedList || payload?.wantedDtl
  if (welfare?.resultCode !== undefined) {
    const code = String(welfare.resultCode)
    if (code !== '0' && code !== '00') {
      throw new OpenDataError(welfare.resultMessage || `resultCode=${code}`, { code, fatal: false })
    }
  }
}

function decodeBody(body, contentType) {
  const trimmed = body.trim()
  const looksJson = trimmed.startsWith('{') || trimmed.startsWith('[')
  if (looksJson || contentType.includes('json')) {
    try {
      return JSON.parse(trimmed)
    } catch {
      if (looksJson) throw new OpenDataError('응답 JSON을 해석할 수 없습니다.')
    }
  }
  if (trimmed.startsWith('<')) return parseXml(trimmed)
  throw new OpenDataError(`알 수 없는 응답 형식입니다: ${trimmed.slice(0, 80)}`)
}

/**
 * serviceKey는 포털에서 이미 URL 인코딩된 형태(Encoding 키)로 주기도 하고,
 * 원본(Decoding 키)으로 주기도 한다. 이중 인코딩을 막기 위해 직접 문자열을 만든다.
 */
function buildUrl(endpoint, serviceKey, params) {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue
    query.set(key, String(value))
  }
  const alreadyEncoded = /%[0-9a-fA-F]{2}/.test(serviceKey)
  const keyParam = alreadyEncoded ? serviceKey : encodeURIComponent(serviceKey)
  const separator = endpoint.includes('?') ? '&' : '?'
  const rest = query.toString()
  return `${endpoint}${separator}serviceKey=${keyParam}${rest ? `&${rest}` : ''}`
}

/**
 * 공공데이터포털 오픈API를 한 번 호출하고 JSON/XML을 공통 객체로 돌려준다.
 * 네트워크·5xx 오류는 재시도하고, 인증·쿼터 오류는 즉시 중단한다.
 */
export async function requestOpenData({
  endpoint,
  serviceKey,
  params = {},
  timeoutMs = DEFAULT_TIMEOUT_MS,
  retries = DEFAULT_RETRIES,
  fetchImpl = fetch
}) {
  if (!serviceKey) throw new OpenDataError('serviceKey가 설정되지 않았습니다.', { fatal: true })

  const url = buildUrl(endpoint, serviceKey, params)
  let lastError = null

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetchImpl(url, {
        headers: { Accept: 'application/json, application/xml;q=0.9, text/xml;q=0.8' },
        signal: AbortSignal.timeout(timeoutMs)
      })
      const body = await response.text()
      const contentType = response.headers.get('content-type') || ''
      const payload = decodeBody(body, contentType)

      // 인증 실패는 403과 함께 오지만 본문 코드가 더 정확하므로 먼저 해석한다.
      assertNoServiceError(payload)

      if (!response.ok) {
        throw new OpenDataError(`HTTP ${response.status}`, {
          status: response.status,
          fatal: response.status === 401 || response.status === 403 || response.status === 404
        })
      }

      return payload
    } catch (error) {
      lastError = error instanceof OpenDataError
        ? error
        : new OpenDataError(error.message || '네트워크 오류', { fatal: false })
      if (lastError.fatal || attempt === retries) break
      await sleep(RETRY_DELAY_MS * (attempt + 1))
    }
  }

  throw lastError
}

/**
 * totalCount를 따라 끝까지 페이지를 넘기며 항목을 모은다.
 * `extract`는 한 페이지 응답에서 `{ items, totalCount }`를 돌려줘야 한다.
 */
export async function collectPages({
  endpoint,
  serviceKey,
  params = {},
  extract,
  numOfRows = 100,
  maxPages = 40,
  pageParam = 'pageNo',
  rowsParam = 'numOfRows',
  fetchImpl = fetch,
  onPage
}) {
  const items = []
  let totalCount = null

  for (let page = 1; page <= maxPages; page += 1) {
    const payload = await requestOpenData({
      endpoint,
      serviceKey,
      params: { ...params, [pageParam]: page, [rowsParam]: numOfRows },
      fetchImpl
    })
    const result = extract(payload)
    const pageItems = result?.items || []
    items.push(...pageItems)
    if (totalCount === null && Number.isFinite(result?.totalCount)) totalCount = result.totalCount
    onPage?.({ page, received: pageItems.length, totalCount })

    if (pageItems.length === 0) break
    if (pageItems.length < numOfRows) break
    if (Number.isFinite(totalCount) && items.length >= totalCount) break
  }

  return { items, totalCount: totalCount ?? items.length }
}
