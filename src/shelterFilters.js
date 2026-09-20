/**
 * 대피처 목록 필터.
 *
 * 유형(머무는 기간)과 이용 대상(성별)은 서로 다른 조건이라 하나의 목록으로 섞으면
 * "여성 + 단기쉼터"처럼 함께 거르는 조합을 만들 수 없다. 두 축을 분리해서 조합한다.
 */
export const SHELTER_TYPE_FILTERS = ['전체', '일시쉼터', '이동쉼터', '단기쉼터', '중장기쉼터']
export const SHELTER_AUDIENCE_FILTERS = ['전체', '누구나', '여성', '남성']

export const DEFAULT_SHELTER_FILTER = { type: '전체', audience: '전체' }

function normalizeSearchText(value) {
  return String(value ?? '').toLocaleLowerCase('ko-KR').replace(/\s+/g, '')
}

function searchableShelterText(shelter) {
  return [
    shelter?.name,
    shelter?.address,
    shelter?.type,
    shelter?.gender,
    shelter?.ages,
    shelter?.open,
    shelter?.phone,
    shelter?.provider,
    shelter?.homepage,
    ...(Array.isArray(shelter?.features) ? shelter.features : [])
  ].map(normalizeSearchText).join(' ')
}

/**
 * @param {Array<{type?: string, gender?: string}>} shelters
 * @param {{type?: string, audience?: string}} filter
 */
export function filterShelters(shelters, filter = DEFAULT_SHELTER_FILTER) {
  const { type = '전체', audience = '전체' } = filter || {}
  if (!Array.isArray(shelters)) return []

  return shelters.filter((shelter) => {
    if (type !== '전체' && shelter.type !== type) return false
    if (audience === '전체') return true
    // '누구나'를 고르면 성별 제한이 없는 곳만 본다.
    if (audience === '누구나') return shelter.gender === '누구나'
    // 여성·남성을 고르면 해당 전용 쉼터와 성별 제한이 없는 곳을 함께 보여준다.
    return shelter.gender === audience || shelter.gender === '누구나'
  })
}

/**
 * 지도 검색창에서 쉼터명뿐 아니라 주소, 유형, 대상, 운영 정보까지 함께 찾는다.
 *
 * @param {Array<object>} shelters
 * @param {string} query
 */
export function searchShelters(shelters, query = '') {
  if (!Array.isArray(shelters)) return []
  const normalizedQuery = normalizeSearchText(query)
  if (!normalizedQuery) return shelters
  return shelters.filter((shelter) => searchableShelterText(shelter).includes(normalizedQuery))
}

/** 현재 걸린 조건을 사람이 읽는 문장으로 만든다. */
export function describeFilter(filter = DEFAULT_SHELTER_FILTER) {
  const { type = '전체', audience = '전체' } = filter || {}
  const parts = []
  if (audience !== '전체') parts.push(audience)
  if (type !== '전체') parts.push(type)
  return parts.length === 0 ? '전체' : parts.join(' · ')
}

/** 기본 조건에서 벗어났는지 여부. 초기화 버튼 표시에 쓴다. */
export function isFilterActive(filter = DEFAULT_SHELTER_FILTER) {
  const { type = '전체', audience = '전체' } = filter || {}
  return type !== '전체' || audience !== '전체'
}
