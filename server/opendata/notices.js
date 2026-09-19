import { collectPages, requestOpenData } from './http.js'
import { toArray } from './xml.js'

/**
 * 한국사회보장정보원_중앙부처복지서비스 (공공데이터포털 데이터 15090532)
 * https://www.data.go.kr/data/15090532/openapi.do
 *
 * 목록/상세 두 개의 오퍼레이션으로 나뉘고 XML만 제공한다.
 * 목록으로 후보를 모은 뒤 상세를 덧붙여 지원 자격·급여 내용까지 채운다.
 */
export const WELFARE_LIST_ENDPOINT =
  'https://apis.data.go.kr/B554287/NationalWelfareInformationsV001/NationalWelfarelistV001'
export const WELFARE_DETAIL_ENDPOINT =
  'https://apis.data.go.kr/B554287/NationalWelfareInformationsV001/NationalWelfaredetailedV001'

/** 생애주기 코드: 003 청소년, 004 청년. Haven 사용자층에 해당하는 값만 수집한다. */
export const YOUTH_LIFE_CODES = ['003', '004']

const CATEGORY_RULES = [
  { category: '주거', pattern: /주거|임대|전세|월세|보증금|주택|기숙|자립정착금|거주/ },
  { category: '식사', pattern: /급식|식사|먹거리|도시락|식품|결식|영양|푸드/ },
  { category: '일자리', pattern: /취업|일자리|고용|직업|훈련|인턴|창업|일경험|구직/ },
  { category: '생활', pattern: /생활|수당|바우처|의료|돌봄|교육|장학|상담|보호|financial|지원금/ }
]

function text(value) {
  if (value === undefined || value === null) return ''
  if (typeof value === 'object') return ''
  return String(value).replace(/\s+/g, ' ').trim()
}

function longText(value) {
  if (value === undefined || value === null) return ''
  if (typeof value === 'object') return ''
  return String(value)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/**
 * 쉼표로 구분된 코드 문자열을 태그 배열로 만든다.
 * '한부모·조손'처럼 가운뎃점이 이름 일부인 분류값이 있어 쉼표와 세미콜론만 구분자로 본다.
 */
function splitTags(...values) {
  const tags = []
  for (const value of values) {
    for (const piece of text(value).split(/[,;]/)) {
      const tag = piece.trim()
      if (tag && tag.length <= 20 && !tags.includes(tag)) tags.push(tag)
    }
  }
  return tags.slice(0, 5)
}

/** 서비스명과 요약에서 UI 카테고리(주거/생활/일자리/식사)를 고른다. */
export function classifyCategory(...sources) {
  const haystack = sources.filter(Boolean).join(' ')
  for (const rule of CATEGORY_RULES) {
    if (rule.pattern.test(haystack)) return rule.category
  }
  return '생활'
}

function truncate(value, limit) {
  if (value.length <= limit) return value
  return `${value.slice(0, limit - 1).trimEnd()}…`
}

/** 목록 레코드 하나를 notices 행 형태로 변환한다. */
export function normalizeWelfareService(record) {
  const title = text(record.servNm)
  const servId = text(record.servId)
  if (!title || !servId) return null

  const summary = longText(record.servDgst)
  const provider = text(record.jurMnofNm) || text(record.jurOrgNm) || '중앙부처'
  const detailLink = text(record.servDtlLink)

  return {
    externalId: `bokjiro:${servId}`,
    servId,
    kind: 'support',
    category: classifyCategory(title, summary, text(record.intrsThemaArray)),
    title,
    summary: truncate(summary, 220),
    content: summary,
    eligibility: [],
    benefits: [],
    tags: splitTags(record.trgterIndvdlArray, record.lifeArray, record.intrsThemaArray),
    applicationUrl: detailLink || null,
    provider,
    // 복지서비스는 마감일 대신 지원주기를 제공한다. 임의 마감일을 만들지 않는다.
    deadline: text(record.sprtCycNm) ? `${text(record.sprtCycNm)} 지원` : '상시 신청',
    sourceUrl: WELFARE_LIST_ENDPOINT,
    publishedAt: parseRegisteredAt(record.svcfrstRegTs),
    onlineApply: /^y$/i.test(text(record.onapPsbltYn)),
    contact: text(record.rprsCtadr)
  }
}

/** svcfrstRegTs는 'YYYYMMDD' 또는 'YYYYMMDDHHmmss' 형태로 온다. */
function parseRegisteredAt(value) {
  const digits = text(value).replace(/\D/g, '')
  if (digits.length < 8) return new Date().toISOString()
  const iso = `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}T00:00:00.000Z`
  const parsed = Date.parse(iso)
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : new Date().toISOString()
}

function extractListPage(payload) {
  const list = payload?.wantedList || {}
  const items = toArray(list.servList)
  const totalCount = Number(text(list.totalCount))
  return { items, totalCount: Number.isFinite(totalCount) ? totalCount : undefined }
}

/**
 * 상세 조회 결과를 기존 공고 객체에 합쳐 지원 자격·급여·신청 방법을 채운다.
 * 상세 호출이 실패해도 목록 정보만으로 서비스가 동작해야 하므로 원본을 그대로 돌려준다.
 */
export function mergeWelfareDetail(notice, payload) {
  const detail = payload?.wantedDtl
  if (!detail) return notice

  const eligibility = [longText(detail.tgtrDtlCn), longText(detail.slctCritCn)].filter(Boolean)
  const benefits = [longText(detail.alwServCn)].filter(Boolean)
  const applyMethods = toArray(detail.applmetList)
    .map((entry) => text(entry?.servSeDetailNm))
    .filter(Boolean)
  const links = toArray(detail.inqplHmpgReldList)
    .map((entry) => text(entry?.servSeDetailLink))
    .filter((link) => /^https?:\/\//.test(link))
  const laws = toArray(detail.baslawList)
    .map((entry) => text(entry?.servSeDetailNm))
    .filter(Boolean)
  const contact = toArray(detail.inqplCtadrList)
    .map((entry) => text(entry?.servSeDetailLink))
    .filter(Boolean)[0]

  const summary = longText(detail.wlfareInfoOutlCn) || notice.summary
  const contentParts = [
    summary,
    applyMethods.length ? `신청 방법\n${applyMethods.map((item) => `- ${item}`).join('\n')}` : '',
    laws.length ? `근거 법령\n${laws.map((item) => `- ${item}`).join('\n')}` : ''
  ].filter(Boolean)

  return {
    ...notice,
    summary: truncate(summary, 220) || notice.summary,
    content: contentParts.join('\n\n') || notice.content,
    eligibility: eligibility.length ? eligibility : notice.eligibility,
    benefits: benefits.length ? benefits : notice.benefits,
    applicationUrl: notice.applicationUrl || links[0] || null,
    contact: notice.contact || contact || '',
    deadline: text(detail.sprtCycNm) ? `${text(detail.sprtCycNm)} 지원` : notice.deadline
  }
}

/**
 * 청소년·청년 대상 중앙부처 복지서비스를 수집한다.
 * @returns {Promise<{items: object[], totalCount: number, detailErrors: object[]}>}
 */
export async function fetchWelfareServices({
  serviceKey,
  listEndpoint = WELFARE_LIST_ENDPOINT,
  detailEndpoint = WELFARE_DETAIL_ENDPOINT,
  lifeCodes = YOUTH_LIFE_CODES,
  numOfRows = 100,
  maxPages = 10,
  withDetail = true,
  detailLimit = 60,
  fetchImpl = fetch,
  onPage
} = {}) {
  const byExternalId = new Map()
  let totalCount = 0

  for (const lifeArray of lifeCodes) {
    const page = await collectPages({
      endpoint: listEndpoint,
      serviceKey,
      // srchKeyCode는 필수 값이며 003은 '사업명 + 사업내용' 검색을 뜻한다.
      params: { callTp: 'L', srchKeyCode: '003', lifeArray },
      extract: extractListPage,
      numOfRows,
      maxPages,
      fetchImpl,
      onPage: (info) => onPage?.({ ...info, lifeArray })
    })
    totalCount += page.totalCount
    for (const record of page.items) {
      const notice = normalizeWelfareService(record)
      if (notice && !byExternalId.has(notice.externalId)) byExternalId.set(notice.externalId, notice)
    }
  }

  const notices = [...byExternalId.values()]
  const detailErrors = []

  if (withDetail) {
    for (const notice of notices.slice(0, detailLimit)) {
      try {
        const payload = await requestOpenData({
          endpoint: detailEndpoint,
          serviceKey,
          params: { callTp: 'D', servId: notice.servId },
          retries: 1,
          fetchImpl
        })
        Object.assign(notice, mergeWelfareDetail(notice, payload))
      } catch (error) {
        detailErrors.push({ servId: notice.servId, message: error.message })
        if (error.fatal) break
      }
    }
  }

  return { items: notices, totalCount: totalCount || notices.length, detailErrors }
}

/**
 * 온통청년(청년정책 통합) 응답용 관용 정규화기.
 *
 * 온통청년 API는 공공데이터포털에서 LINK 유형으로만 제공되어 별도 수동 승인이 필요하고,
 * 승인 시점의 스펙 버전에 따라 필드명이 달라진다. 그래서 자주 쓰이는 필드명을 모두 받아준다.
 */
export function normalizeYouthPolicy(record, sourceUrl) {
  const title = text(record.plcyNm || record.polyBizSjnm || record.title)
  const externalKey = text(record.plcyNo || record.bizId || record.polyBizSecd || title)
  if (!title || !externalKey) return null

  const summary = longText(record.plcyExplnCn || record.polyItcnCn || record.summary)
  const content = longText(record.plcySprtCn || record.sporCn || record.content) || summary
  const period = text(record.aplyYmd || record.rqutPrdCn || record.bizApplyPd)

  return {
    externalId: `youthcenter:${externalKey}`,
    kind: 'support',
    category: classifyCategory(title, summary, text(record.lclsfNm || record.polyRlmCd)),
    title,
    summary: truncate(summary, 220),
    content,
    eligibility: [longText(record.addAplyQlfcCndCn || record.accrRqisCn)].filter(Boolean),
    benefits: [longText(record.plcySprtCn || record.sporCn)].filter(Boolean),
    tags: splitTags(record.lclsfNm, record.mclsfNm, record.sprvsnInstCdNm, record.polyRlmCd),
    applicationUrl: text(record.aplyUrlAddr || record.rqutUrla || record.applUrl) || null,
    provider: text(record.sprvsnInstCdNm || record.operInstCdNm || record.cnsgNmor) || '청년정책',
    deadline: period || '상시 신청',
    sourceUrl,
    publishedAt: new Date().toISOString()
  }
}

/**
 * 온통청년 계열 엔드포인트에서 청년정책을 수집한다.
 * 엔드포인트와 키 파라미터명이 환경변수로 주입되어야 동작한다(수동 승인 필요).
 */
export async function fetchYouthPolicies({
  serviceKey,
  endpoint,
  keyParam = 'apiKeyNm',
  extraParams = {},
  numOfRows = 100,
  maxPages = 5,
  fetchImpl = fetch
} = {}) {
  if (!endpoint || !serviceKey) return { items: [], totalCount: 0, skipped: true }

  const items = []
  for (let page = 1; page <= maxPages; page += 1) {
    const url = new URL(endpoint)
    url.searchParams.set(keyParam, serviceKey)
    url.searchParams.set('pageNum', String(page))
    url.searchParams.set('pageSize', String(numOfRows))
    url.searchParams.set('pageIndex', String(page))
    url.searchParams.set('display', String(numOfRows))
    url.searchParams.set('rtnType', 'json')
    for (const [key, value] of Object.entries(extraParams)) url.searchParams.set(key, String(value))

    const response = await fetchImpl(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(15_000)
    })
    if (!response.ok) throw new Error(`youth-policy-http-${response.status}`)
    const payload = await response.json()
    const records =
      payload?.result?.youthPolicyList ||
      payload?.youthPolicyList ||
      payload?.result?.list ||
      payload?.items ||
      []
    if (!Array.isArray(records) || records.length === 0) break

    for (const record of records) {
      const notice = normalizeYouthPolicy(record, endpoint)
      if (notice) items.push(notice)
    }
    if (records.length < numOfRows) break
  }

  return { items, totalCount: items.length, skipped: false }
}
