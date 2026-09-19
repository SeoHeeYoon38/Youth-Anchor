const ADDRESS_ENDPOINT = 'https://dapi.kakao.com/v2/local/search/address.json'
const KEYWORD_ENDPOINT = 'https://dapi.kakao.com/v2/local/search/keyword.json'

function pickDocument(documents) {
  const first = documents?.[0]
  if (!first) return null
  const lat = Number(first.y ?? first.road_address?.y ?? first.address?.y)
  const lng = Number(first.x ?? first.road_address?.x ?? first.address?.x)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  return { lat, lng }
}

/**
 * 카카오 로컬 API로 주소 → 좌표를 변환한다.
 *
 * 청소년쉼터 오픈API는 대부분 위경도를 함께 주지만 일부 행이 비어 있어 그 공백만 메운다.
 * 카카오 JavaScript 키가 아니라 REST API 키가 필요하다(KAKAO_REST_API_KEY).
 */
export function createGeocoder({
  restApiKey = process.env.KAKAO_REST_API_KEY,
  fetchImpl = fetch,
  timeoutMs = 8000
} = {}) {
  const configured = Boolean(restApiKey)
  const cache = new Map()

  async function query(endpoint, searchParams) {
    const url = new URL(endpoint)
    for (const [key, value] of Object.entries(searchParams)) url.searchParams.set(key, value)
    const response = await fetchImpl(url, {
      headers: { Authorization: `KakaoAK ${restApiKey}` },
      signal: AbortSignal.timeout(timeoutMs)
    })
    if (!response.ok) throw new Error(`kakao-geocode-http-${response.status}`)
    const payload = await response.json()
    return pickDocument(payload?.documents)
  }

  return {
    configured,
    async geocode(address, fallbackKeyword = '') {
      if (!configured || !address) return null
      const cacheKey = `${address}|${fallbackKeyword}`
      if (cache.has(cacheKey)) return cache.get(cacheKey)

      let coordinates
      try {
        coordinates = await query(ADDRESS_ENDPOINT, { query: address, size: '1' })
        // 도로명 주소가 정규화되지 않은 행은 장소명 검색이 더 잘 맞는다.
        if (!coordinates && fallbackKeyword) {
          coordinates = await query(KEYWORD_ENDPOINT, { query: fallbackKeyword, size: '1' })
        }
      } catch {
        coordinates = null
      }

      cache.set(cacheKey, coordinates ?? null)
      return coordinates ?? null
    }
  }
}
