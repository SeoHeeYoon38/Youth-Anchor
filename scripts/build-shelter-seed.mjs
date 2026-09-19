/**
 * 전국 청소년쉼터 시드 데이터 생성 스크립트.
 *
 * 공공데이터포털의 '성평등가족부_청소년쉼터 현황' 파일데이터는 인증키 없이 내려받을 수 있다.
 * 이 CSV로 실제 쉼터 목록을 만들어 두면 서비스키 발급 전에도 앱이 실데이터로 동작한다.
 * 파일에는 좌표가 없어 OpenStreetMap Nominatim으로 주소를 좌표로 바꾼다.
 *
 * 사용법: node scripts/build-shelter-seed.mjs
 *
 * 오픈API(getTeenRAreaListV2) 동기화가 성공하면 이 시드는 최신 데이터로 대체된다.
 */
import { writeFile } from 'node:fs/promises'

const FILE_DATA_PAGE = 'https://www.data.go.kr/data/3084536/fileData.do'
const DOWNLOAD_URL =
  'https://www.data.go.kr/cmm/cmm/fileDownload.do?atchFileId=FILE_000000003211843&fileDetailSn=1&insertDataPrcus=N'
const NOMINATIM = 'https://nominatim.openstreetmap.org/search'
// Nominatim 이용 정책상 초당 1건을 넘기지 않는다.
const GEOCODE_DELAY_MS = 1200
const OUTPUT_PATH = new URL('../server/seed/shelters.json', import.meta.url)

const SIDO_FULL_NAMES = {
  서울: '서울특별시',
  부산: '부산광역시',
  대구: '대구광역시',
  인천: '인천광역시',
  광주: '광주광역시',
  대전: '대전광역시',
  울산: '울산광역시',
  세종: '세종특별자치시',
  경기: '경기도',
  강원: '강원특별자치도',
  충북: '충청북도',
  충남: '충청남도',
  전북: '전북특별자치도',
  전남: '전라남도',
  경북: '경상북도',
  경남: '경상남도',
  제주: '제주특별자치도'
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** 공공데이터포털 파일데이터는 CP949로 인코딩되어 있다. */
async function downloadCsv() {
  const response = await fetch(DOWNLOAD_URL, { redirect: 'follow' })
  if (!response.ok) throw new Error(`파일 다운로드 실패: HTTP ${response.status}`)
  const buffer = await response.arrayBuffer()
  return new TextDecoder('euc-kr').decode(buffer)
}

/** 따옴표로 묶인 값 안에 쉼표가 들어 있어 직접 파싱한다. */
function parseCsv(text) {
  const rows = []
  let row = []
  let value = ''
  let quoted = false

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    if (quoted) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          value += '"'
          index += 1
        } else {
          quoted = false
        }
      } else {
        value += char
      }
      continue
    }
    if (char === '"') {
      quoted = true
    } else if (char === ',') {
      row.push(value)
      value = ''
    } else if (char === '\n') {
      row.push(value)
      rows.push(row)
      row = []
      value = ''
    } else if (char !== '\r') {
      value += char
    }
  }
  if (value || row.length > 0) {
    row.push(value)
    rows.push(row)
  }

  const [header, ...body] = rows.filter((entry) => entry.some((cell) => cell.trim()))
  const keys = header.map((key) => key.trim())
  return body.map((entry) => Object.fromEntries(keys.map((key, index) => [key, (entry[index] || '').trim()])))
}

/** '단기쉼터(여자)' 같은 시설유형에서 유형과 이용 대상 성별을 분리한다. */
function parseFacilityType(rawType) {
  const type = rawType.includes('중장기')
    ? '중장기쉼터'
    : rawType.includes('단기')
      ? '단기쉼터'
      : rawType.includes('이동형')
        ? '이동쉼터'
        : '일시쉼터'

  const gender = rawType.includes('여자') ? '여성' : rawType.includes('남자') ? '남성' : '누구나'
  const mode = rawType.includes('이동형') ? '이동형' : rawType.includes('고정형') ? '고정형' : ''
  return { type, gender, mode }
}

function buildFeatures(type, mode) {
  const features = []
  if (type === '중장기쉼터') features.push('중장기 거주')
  else if (type === '단기쉼터') features.push('숙박 가능')
  else if (type === '이동쉼터') features.push('현장 찾아오기')
  else features.push('단기 보호')
  if (mode) features.push(mode)
  return features
}

/** 연령 기준은 청소년복지지원법상 쉼터 이용 대상을 따른다. */
function agesFor(type) {
  return type === '일시쉼터' || type === '이동쉼터' ? '9~24세' : '9~24세'
}

/**
 * 주소를 좌표로 바꾼다. 괄호 안 상세 위치나 층수 표기가 있으면 실패하기 쉬워
 * 점점 단순한 형태로 다시 시도한다.
 */
/**
 * 주소에서 건물 상세 정보를 걷어내고 도로명 표기를 정규화한다.
 * '종로 11길 11'처럼 도로명과 길 번호 사이에 공백이 들어가는 표기가 섞여 있어
 * 이를 '종로11길 11'로 붙여야 검색이 맞는다.
 */
function normalizeAddress(address) {
  return address
    .replace(/\([^)]*\)/g, ' ')
    .replace(/(로|길|대로)\s+(\d+)\s*길/g, '$1$2길')
    .replace(/\s+/g, ' ')
    .trim()
}

/** 정규화된 주소에서 '도로명 + 건물번호'만 뽑는다. */
function extractStreet(address) {
  const match = /([가-힣A-Za-z0-9]+(?:대로|로|길))\s*(\d+(?:-\d+)?)/.exec(normalizeAddress(address))
  if (!match) return { street: '', road: '' }
  return { street: `${match[1]} ${match[2]}`, road: match[1] }
}

async function queryNominatim(params) {
  const url = new URL(NOMINATIM)
  for (const [key, value] of Object.entries({ ...params, format: 'json', limit: '1', countrycodes: 'kr' })) {
    if (value) url.searchParams.set(key, String(value))
  }
  const response = await fetch(url, {
    headers: { 'User-Agent': 'HavenYouthShelterMap/1.0 (github.com/SeoHeeYoon38/Youth-Anchor)' }
  })
  await sleep(GEOCODE_DELAY_MS)
  if (!response.ok) return null
  const results = await response.json()
  if (!Array.isArray(results) || results.length === 0) return null
  return {
    lat: Number(Number(results[0].lat).toFixed(6)),
    lng: Number(Number(results[0].lon).toFixed(6))
  }
}

/**
 * 주소를 좌표로 바꾼다.
 *
 * 건물 단위 → 도로 단위 → 시군구 단위 순으로 시도하고, 어느 단위에서 맞았는지
 * precision에 남긴다. 거리 정렬이 핵심 기능이라 시군구 단위로 떨어진 건수는
 * 스크립트 종료 시 따로 보고한다.
 */
async function geocode(address, region) {
  const [state, city] = region.split(' ')
  const { street, road } = extractStreet(address)
  const normalized = normalizeAddress(address)

  const attempts = [
    { precision: 'address', params: { q: `${state} ${city} ${street}` }, when: Boolean(street) },
    { precision: 'address', params: { q: normalized }, when: true },
    { precision: 'street', params: { street, city, state, country: 'KR' }, when: Boolean(street) },
    { precision: 'street-approx', params: { street: road, city, state, country: 'KR' }, when: Boolean(road) },
    { precision: 'region', params: { q: region }, when: true }
  ]

  for (const attempt of attempts) {
    if (!attempt.when) continue
    const located = await queryNominatim(attempt.params)
    if (located) return { ...located, precision: attempt.precision }
  }
  return null
}

const csv = await downloadCsv()
const rows = parseCsv(csv)
console.log(`CSV ${rows.length}행 파싱 완료`)

const shelters = []
const failures = []
let regionLevel = 0

for (const [index, row] of rows.entries()) {
  const name = row['시설명']
  const address = row['시설주소']
  if (!name || !address) continue

  const { type, gender, mode } = parseFacilityType(row['시설유형'] || '')
  const sido = SIDO_FULL_NAMES[row['시도']] || row['시도']
  const region = `${sido} ${row['시군구']}`.trim()

  const located = await geocode(address, region)
  if (!located) {
    failures.push(name)
    continue
  }
  if (located.precision === 'region') {
    regionLevel += 1
    console.warn(`  [시군구 단위] ${name} — ${address}`)
  }

  shelters.push({
    externalId: `mogef-file:${row['연번']}:${name}`,
    name,
    type,
    gender,
    ages: agesFor(type),
    lat: located.lat,
    lng: located.lng,
    address,
    phone: row['대표전화'] || '1388',
    open: '운영시간 전화 확인',
    features: buildFeatures(type, mode),
    capacity: null,
    region,
    homepage: null,
    entryTarget: `${gender === '누구나' ? '위기' : gender} 청소년`,
    entryPeriod: '',
    geocodePrecision: located.precision
  })

  if ((index + 1) % 20 === 0) console.log(`  ${index + 1}/${rows.length} 진행`)
}

await writeFile(OUTPUT_PATH, `${JSON.stringify(shelters, null, 2)}\n`, 'utf8')

console.log(`\n완료: ${shelters.length}개 저장`)
console.log(`  주소 단위 좌표: ${shelters.length - regionLevel}개`)
console.log(`  시군구 단위 좌표: ${regionLevel}개`)
if (failures.length > 0) console.log(`  좌표 실패: ${failures.length}개 (${failures.join(', ')})`)
console.log(`\n출처: ${FILE_DATA_PAGE}`)
