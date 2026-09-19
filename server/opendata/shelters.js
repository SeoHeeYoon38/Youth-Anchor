import { collectPages } from './http.js'

/**
 * 성평등가족부_청소년쉼터 (공공데이터포털 데이터 15109778)
 * https://www.data.go.kr/data/15109778/openapi.do
 *
 * 응답에 위도(lat)/경도(lot)가 포함되어 있어 별도 지오코딩 없이 바로 쓸 수 있고,
 * 좌표가 비어 있는 행만 지오코딩으로 보정한다.
 */
export const SHELTER_ENDPOINT = 'https://apis.data.go.kr/1383000/gmis/teenRAreaServiceV2/getTeenRAreaListV2'

const FEMALE_PATTERN = /여자|여성|여청소년/
const MALE_PATTERN = /남자|남성|남청소년/
const AGE_PATTERN = /(\d{1,2})\s*(?:세)?\s*[~\-–]\s*(\d{1,2})\s*세?/

function text(value) {
  if (value === undefined || value === null) return ''
  if (typeof value === 'object') return ''
  return String(value).trim()
}

function numeric(value) {
  const parsed = Number(text(value))
  return Number.isFinite(parsed) ? parsed : null
}

function coordinate(value, limit) {
  const parsed = numeric(value)
  if (parsed === null || parsed === 0) return null
  return Math.abs(parsed) <= limit ? parsed : null
}

/** 시설명·유형·입소대상 문구에서 이용 대상 성별을 추론한다. */
function inferGender(...sources) {
  const haystack = sources.filter(Boolean).join(' ')
  const female = FEMALE_PATTERN.test(haystack)
  const male = MALE_PATTERN.test(haystack)
  if (female && !male) return '여성'
  if (male && !female) return '남성'
  return '누구나'
}

/** 시설유형명을 UI가 쓰는 짧은 라벨(일시/단기/중장기/이동)로 정리한다. */
function normalizeType(facilityType, operationMode) {
  const haystack = `${facilityType} ${operationMode}`
  if (/이동/.test(haystack)) return '이동쉼터'
  if (/중장기/.test(haystack)) return '중장기쉼터'
  if (/단기/.test(haystack)) return '단기쉼터'
  if (/일시/.test(haystack)) return '일시쉼터'
  return facilityType || '청소년쉼터'
}

/** 입소대상 문구에서 연령 범위를 뽑는다. 못 찾으면 청소년복지지원법 기준을 쓴다. */
function normalizeAges(entryTarget) {
  const match = AGE_PATTERN.exec(entryTarget || '')
  if (match) return `${match[1]}~${match[2]}세`
  if (/청소년/.test(entryTarget || '')) return '9~24세'
  return '9~24세'
}

/**
 * 카드·시트에 노출할 태그를 만든다.
 * 실제 응답에 근거가 있는 항목만 넣고, 확인되지 않은 편의시설은 추측하지 않는다.
 */
function buildFeatures(record, type) {
  const features = []
  if (type === '중장기쉼터' || type === '단기쉼터') features.push('숙박 가능')
  if (type === '일시쉼터') features.push('단기 보호')
  if (type === '이동쉼터') features.push('현장 찾아오기')
  const capacity = numeric(record.cpctCnt)
  if (capacity && capacity > 0) features.push(`정원 ${capacity}명`)
  if (text(record.nrbSbwNm)) features.push(`${text(record.nrbSbwNm)} 인근`)
  else if (text(record.nrbBusStnNm)) features.push(`${text(record.nrbBusStnNm)} 인근`)
  if (text(record.hmpgAddr)) features.push('홈페이지 안내')
  return features.slice(0, 5)
}

/** 원본 레코드를 repository.upsertShelter가 받는 형태로 변환한다. */
export function normalizeShelter(record) {
  const name = text(record.fcltNm)
  if (!name) return null
  // expsrYn은 제공기관이 노출 여부를 직접 관리하는 값이라 false면 제외한다.
  const exposure = text(record.expsrYn)
  if (exposure && /^(false|n|no|0)$/i.test(exposure)) return null

  const address = text(record.roadNmAddr) || text(record.lotnoAddr)
  if (!address) return null

  const facilityType = text(record.fcltTypeNm)
  const operationMode = text(record.operModeCn)
  const entryTarget = text(record.etrTrgtCn)
  const type = normalizeType(facilityType, operationMode)
  const sido = text(record.ctpvNm)
  const sigungu = text(record.sggNm)

  return {
    externalId: `mogef-shelter:${name}:${address}`,
    name,
    type,
    gender: inferGender(name, facilityType, entryTarget, operationMode),
    ages: normalizeAges(entryTarget),
    lat: coordinate(record.lat, 90),
    lng: coordinate(record.lot, 180),
    address,
    phone: text(record.rprsTelno) || '1388',
    open: operationMode ? `${operationMode} 운영` : '운영시간 전화 확인',
    features: buildFeatures(record, type),
    capacity: numeric(record.cpctCnt),
    region: [sido, sigungu].filter(Boolean).join(' '),
    homepage: text(record.hmpgAddr) || null,
    entryTarget,
    entryPeriod: text(record.etrPrdCn),
    source: 'mogef-teen-shelter',
    sourceUrl: SHELTER_ENDPOINT
  }
}

function extractPage(payload) {
  const body = payload?.response?.body || payload?.body || {}
  const raw = body?.items?.item ?? body?.items ?? []
  const items = Array.isArray(raw) ? raw : raw ? [raw] : []
  const totalCount = Number(body?.totalCount)
  return { items, totalCount: Number.isFinite(totalCount) ? totalCount : undefined }
}

/**
 * 전국 청소년쉼터 목록을 모두 내려받아 정규화한다.
 * @returns {Promise<{items: object[], totalCount: number, skipped: number}>}
 */
export async function fetchYouthShelters({
  serviceKey,
  endpoint = SHELTER_ENDPOINT,
  numOfRows = 100,
  maxPages = 20,
  params = {},
  fetchImpl = fetch,
  onPage
} = {}) {
  const { items, totalCount } = await collectPages({
    endpoint,
    serviceKey,
    params: { type: 'json', ...params },
    extract: extractPage,
    numOfRows,
    maxPages,
    fetchImpl,
    onPage
  })

  const normalized = []
  const seen = new Set()
  for (const record of items) {
    const shelter = normalizeShelter(record)
    if (!shelter || seen.has(shelter.externalId)) continue
    seen.add(shelter.externalId)
    normalized.push(shelter)
  }

  return { items: normalized, totalCount, skipped: items.length - normalized.length }
}
