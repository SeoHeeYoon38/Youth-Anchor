import assert from 'node:assert/strict'
import test from 'node:test'
import { createDatabase } from './database.js'
import { OpenDataError, requestOpenData } from './opendata/http.js'
import { parseXml, toArray } from './opendata/xml.js'
import { fetchYouthShelters, normalizeShelter } from './opendata/shelters.js'
import {
  classifyCategory,
  mergeWelfareDetail,
  normalizeWelfareService,
  fetchWelfareServices
} from './opendata/notices.js'
import { millisecondsUntilNextRun, resolveOpenDataConfig, syncShelters, syncSupportNotices } from './sync.js'

const SHELTER_RECORD = {
  fcltNm: '서울시립 강북여자단기청소년쉼터',
  fcltTypeNm: '단기쉼터',
  operModeCn: '단기(여자)',
  cpctCnt: 12,
  etrTrgtCn: '만 9세~24세 여자 청소년',
  etrPrdCn: '3개월(최대 9개월 연장)',
  rprsTelno: '02-1234-5678',
  roadNmAddr: '서울특별시 강북구 도봉로 100',
  lotnoAddr: '서울특별시 강북구 미아동 1-1',
  ctpvNm: '서울특별시',
  sggNm: '강북구',
  lat: 37.6396,
  lot: 127.0257,
  hmpgAddr: 'https://example.or.kr',
  nrbSbwNm: '미아사거리역',
  expsrYn: true
}

function shelterPayload(items, totalCount) {
  return { response: { header: { resultCode: '00', resultMsg: 'OK' }, body: { items: { item: items }, totalCount, numOfRows: 100, pageNo: 1 } } }
}

const WELFARE_LIST_XML = `<?xml version="1.0" encoding="UTF-8"?>
<wantedList>
  <totalCount>2</totalCount>
  <pageNo>1</pageNo>
  <numOfRows>100</numOfRows>
  <resultCode>0</resultCode>
  <resultMessage>SUCCESS</resultMessage>
  <servList>
    <servId>WLF00001234</servId>
    <servNm>청소년 주거지원 통합서비스</servNm>
    <servDgst>보호종료 청소년에게 임대주택과 월세를 지원합니다.</servDgst>
    <servDtlLink>https://www.bokjiro.go.kr/detail?servId=WLF00001234</servDtlLink>
    <jurMnofNm>보건복지부</jurMnofNm>
    <jurOrgNm>자립지원과</jurOrgNm>
    <lifeArray>청소년</lifeArray>
    <trgterIndvdlArray>저소득,한부모·조손</trgterIndvdlArray>
    <intrsThemaArray>주거</intrsThemaArray>
    <sprtCycNm>월</sprtCycNm>
    <srvPvsnNm>현금</srvPvsnNm>
    <onapPsbltYn>Y</onapPsbltYn>
    <rprsCtadr>129</rprsCtadr>
    <svcfrstRegTs>20240115</svcfrstRegTs>
  </servList>
  <servList>
    <servId>WLF00005678</servId>
    <servNm>청년 일경험 지원사업</servNm>
    <servDgst>직무 체험과 취업 연계를 제공합니다.</servDgst>
    <jurMnofNm>고용노동부</jurMnofNm>
    <lifeArray>청년</lifeArray>
    <sprtCycNm>1회성</sprtCycNm>
    <svcfrstRegTs>20250320</svcfrstRegTs>
  </servList>
</wantedList>`

const WELFARE_DETAIL_XML = `<?xml version="1.0" encoding="UTF-8"?>
<wantedDtl>
  <servId>WLF00001234</servId>
  <servNm>청소년 주거지원 통합서비스</servNm>
  <wlfareInfoOutlCn>보호종료 후 5년 이내 청년에게 주거를 지원합니다.</wlfareInfoOutlCn>
  <tgtrDtlCn>아동복지시설 보호종료 5년 이내인 사람</tgtrDtlCn>
  <slctCritCn>소득 기준 없음</slctCritCn>
  <alwServCn>임대보증금 지원 및 월 30만원 주거비</alwServCn>
  <sprtCycNm>월</sprtCycNm>
  <applmetList>
    <servSeCode>01</servSeCode>
    <servSeDetailNm>주민센터 방문 또는 복지로 온라인 신청</servSeDetailNm>
  </applmetList>
  <inqplHmpgReldList>
    <servSeDetailNm>복지로</servSeDetailNm>
    <servSeDetailLink>https://www.bokjiro.go.kr</servSeDetailLink>
  </inqplHmpgReldList>
  <inqplCtadrList>
    <servSeDetailNm>보건복지상담센터</servSeDetailNm>
    <servSeDetailLink>129</servSeDetailLink>
  </inqplCtadrList>
  <baslawList>
    <servSeDetailNm>아동복지법 제38조</servSeDetailNm>
  </baslawList>
  <resultCode>0</resultCode>
  <resultMessage>SUCCESS</resultMessage>
</wantedDtl>`

function jsonResponse(payload) {
  return {
    ok: true,
    status: 200,
    headers: new Headers({ 'content-type': 'application/json' }),
    text: async () => JSON.stringify(payload)
  }
}

function xmlResponse(body, status = 200) {
  return {
    ok: status < 400,
    status,
    headers: new Headers({ 'content-type': 'application/xml' }),
    text: async () => body
  }
}

test('XML 파서가 반복 노드를 배열로 만든다', () => {
  const parsed = parseXml(WELFARE_LIST_XML)
  assert.equal(parsed.wantedList.totalCount, '2')
  assert.equal(toArray(parsed.wantedList.servList).length, 2)
  assert.equal(parsed.wantedList.servList[0].servNm, '청소년 주거지원 통합서비스')
})

test('XML 파서가 단일 노드와 빈 노드를 견딘다', () => {
  const parsed = parseXml('<root><a>1</a><b/><c><d>x</d></c></root>')
  assert.equal(parsed.root.a, '1')
  assert.equal(parsed.root.b, '')
  assert.deepEqual(parsed.root.c, { d: 'x' })
  assert.deepEqual(toArray(parsed.root.a), ['1'])
  assert.deepEqual(toArray(parsed.root.missing), [])
})

test('등록되지 않은 서비스키 응답을 치명적 오류로 승격한다', async () => {
  const body = `<OpenAPI_ServiceResponse><cmmMsgHeader><errMsg>SERVICE_KEY_IS_NOT_REGISTERED_ERROR</errMsg><returnReasonCode>30</returnReasonCode></cmmMsgHeader></OpenAPI_ServiceResponse>`
  let calls = 0
  await assert.rejects(
    () => requestOpenData({
      endpoint: 'https://apis.data.go.kr/test',
      serviceKey: 'dummy',
      fetchImpl: async () => {
        calls += 1
        return xmlResponse(body, 403)
      }
    }),
    (error) => {
      assert.ok(error instanceof OpenDataError)
      assert.equal(error.code, '30')
      assert.equal(error.fatal, true)
      return true
    }
  )
  // 인증 오류는 재시도하지 않는다.
  assert.equal(calls, 1)
})

test('serviceKey를 이중 인코딩하지 않는다', async () => {
  const seen = []
  await requestOpenData({
    endpoint: 'https://apis.data.go.kr/test',
    serviceKey: 'abc%2Bdef%3D%3D',
    params: { pageNo: 1 },
    fetchImpl: async (url) => {
      seen.push(String(url))
      return jsonResponse({ response: { header: { resultCode: '00' }, body: {} } })
    }
  })
  assert.ok(seen[0].includes('serviceKey=abc%2Bdef%3D%3D'))
  assert.ok(!seen[0].includes('%252B'))
})

test('청소년쉼터 레코드를 UI 스키마로 정규화한다', () => {
  const shelter = normalizeShelter(SHELTER_RECORD)
  assert.equal(shelter.name, '서울시립 강북여자단기청소년쉼터')
  assert.equal(shelter.type, '단기쉼터')
  assert.equal(shelter.gender, '여성')
  assert.equal(shelter.ages, '9~24세')
  assert.equal(shelter.lat, 37.6396)
  assert.equal(shelter.lng, 127.0257)
  assert.equal(shelter.phone, '02-1234-5678')
  assert.equal(shelter.capacity, 12)
  assert.equal(shelter.region, '서울특별시 강북구')
  assert.equal(shelter.source, 'mogef-teen-shelter')
  assert.ok(shelter.features.includes('정원 12명'))
  assert.ok(shelter.features.includes('미아사거리역 인근'))
})

test('이름이나 주소가 없는 레코드와 비노출 레코드는 버린다', () => {
  assert.equal(normalizeShelter({ fcltNm: '', roadNmAddr: '서울' }), null)
  assert.equal(normalizeShelter({ fcltNm: '쉼터', roadNmAddr: '', lotnoAddr: '' }), null)
  assert.equal(normalizeShelter({ ...SHELTER_RECORD, expsrYn: 'false' }), null)
})

test('좌표가 비어도 정규화는 성공하고 좌표만 null이 된다', () => {
  const shelter = normalizeShelter({ ...SHELTER_RECORD, lat: 0, lot: '' })
  assert.equal(shelter.lat, null)
  assert.equal(shelter.lng, null)
})

test('청소년쉼터 목록을 페이지 끝까지 수집하고 중복을 제거한다', async () => {
  const firstPage = Array.from({ length: 2 }, (_, index) => ({ ...SHELTER_RECORD, fcltNm: `쉼터${index}`, roadNmAddr: `주소${index}` }))
  const requests = []
  const result = await fetchYouthShelters({
    serviceKey: 'dummy',
    numOfRows: 2,
    fetchImpl: async (url) => {
      requests.push(String(url))
      const page = new URL(url).searchParams.get('pageNo')
      if (page === '1') return jsonResponse(shelterPayload(firstPage, 3))
      return jsonResponse(shelterPayload([{ ...SHELTER_RECORD, fcltNm: '쉼터0', roadNmAddr: '주소0' }], 3))
    }
  })
  assert.equal(requests.length, 2)
  assert.equal(result.items.length, 2)
  assert.ok(requests[0].includes('type=json'))
})

test('복지서비스 목록과 상세를 합쳐 지원 자격까지 채운다', () => {
  const list = toArray(parseXml(WELFARE_LIST_XML).wantedList.servList)
  const notice = normalizeWelfareService(list[0])
  assert.equal(notice.externalId, 'bokjiro:WLF00001234')
  assert.equal(notice.category, '주거')
  assert.equal(notice.provider, '보건복지부')
  assert.equal(notice.deadline, '월 지원')
  assert.equal(notice.publishedAt.slice(0, 10), '2024-01-15')
  assert.deepEqual(notice.tags.slice(0, 2), ['저소득', '한부모·조손'])

  const merged = mergeWelfareDetail(notice, parseXml(WELFARE_DETAIL_XML))
  assert.ok(merged.eligibility[0].includes('보호종료 5년 이내'))
  assert.ok(merged.benefits[0].includes('월 30만원'))
  assert.ok(merged.content.includes('신청 방법'))
  assert.ok(merged.content.includes('아동복지법 제38조'))
  assert.equal(merged.contact, '129')
})

test('카테고리 분류가 UI 탭과 일치한다', () => {
  assert.equal(classifyCategory('청년 월세 지원'), '주거')
  assert.equal(classifyCategory('결식아동 급식카드'), '식사')
  assert.equal(classifyCategory('청년 취업 훈련'), '일자리')
  assert.equal(classifyCategory('알 수 없는 사업'), '생활')
})

test('복지서비스 수집이 생애주기 코드마다 목록을 호출한다', async () => {
  const lifeCodes = []
  const result = await fetchWelfareServices({
    serviceKey: 'dummy',
    lifeCodes: ['003', '004'],
    withDetail: false,
    numOfRows: 100,
    fetchImpl: async (url) => {
      const params = new URL(url).searchParams
      lifeCodes.push(params.get('lifeArray'))
      assert.equal(params.get('callTp'), 'L')
      assert.equal(params.get('srchKeyCode'), '003')
      return xmlResponse(WELFARE_LIST_XML)
    }
  })
  assert.deepEqual(lifeCodes, ['003', '004'])
  // 같은 servId는 한 번만 저장한다.
  assert.equal(result.items.length, 2)
})

test('쉼터 동기화가 좌표 없는 행을 지오코딩으로 보정한다', async () => {
  const repository = createDatabase(':memory:')
  const config = resolveOpenDataConfig({ DATA_GO_KR_SERVICE_KEY: 'dummy' })
  const geocoded = []

  const run = await syncShelters({
    repository,
    config,
    geocoder: {
      configured: true,
      geocode: async (address) => {
        geocoded.push(address)
        return { lat: 35.1595, lng: 126.8526 }
      }
    },
    logger: {},
    fetchImpl: async () => jsonResponse(shelterPayload([
      SHELTER_RECORD,
      { ...SHELTER_RECORD, fcltNm: '좌표없는쉼터', roadNmAddr: '광주광역시 동구 1', lat: null, lot: null }
    ], 2))
  })

  assert.equal(run.status, 'ok')
  assert.equal(run.imported, 2)
  assert.deepEqual(geocoded, ['광주광역시 동구 1'])
  const stored = repository.listShelters()
  assert.equal(stored.length, 2)
  assert.equal(stored.find((item) => item.name === '좌표없는쉼터').lat, 35.1595)
  repository.close()
})

test('쉼터 동기화를 다시 돌려도 행이 늘지 않는다', async () => {
  const repository = createDatabase(':memory:')
  const config = resolveOpenDataConfig({ DATA_GO_KR_SERVICE_KEY: 'dummy' })
  const fetchImpl = async () => jsonResponse(shelterPayload([SHELTER_RECORD], 1))
  const options = { repository, config, geocoder: { configured: false, geocode: async () => null }, logger: {}, fetchImpl }

  await syncShelters(options)
  await syncShelters(options)

  assert.equal(repository.countShelters(), 1)
  repository.close()
})

test('실데이터가 들어오면 샘플 시드를 지운다', async () => {
  const repository = createDatabase(':memory:')
  repository.upsertShelter({ externalId: 'seed:sample', name: '샘플 쉼터', type: '일시쉼터', lat: 37.5, lng: 127, address: '샘플', source: 'seed' })
  assert.equal(repository.countShelters(), 1)

  await syncShelters({
    repository,
    config: resolveOpenDataConfig({ DATA_GO_KR_SERVICE_KEY: 'dummy' }),
    geocoder: { configured: false, geocode: async () => null },
    logger: {},
    fetchImpl: async () => jsonResponse(shelterPayload([SHELTER_RECORD], 1))
  })

  const stored = repository.listShelters()
  assert.equal(stored.length, 1)
  assert.equal(stored[0].source, 'mogef-teen-shelter')
  repository.close()
})

test('서비스키가 없으면 동기화를 건너뛰고 이유를 남긴다', async () => {
  const repository = createDatabase(':memory:')
  const config = resolveOpenDataConfig({})
  const run = await syncShelters({ repository, config, logger: {}, fetchImpl: async () => { throw new Error('호출되면 안 됨') } })
  assert.equal(run.status, 'skipped')
  assert.match(run.message, /DATA_GO_KR_SERVICE_KEY/)
  repository.close()
})

test('공지 동기화가 복지서비스 결과를 DB에 저장한다', async () => {
  const repository = createDatabase(':memory:')
  const run = await syncSupportNotices({
    repository,
    config: resolveOpenDataConfig({ DATA_GO_KR_SERVICE_KEY: 'dummy', HAVEN_WELFARE_DETAIL_LIMIT: '0' }),
    logger: {},
    fetchImpl: async () => xmlResponse(WELFARE_LIST_XML)
  })
  assert.equal(run.status, 'ok')
  assert.equal(run.imported, 2)
  const notices = repository.listNotices({})
  assert.equal(notices.length, 2)
  assert.ok(notices.some((notice) => notice.category === '주거'))
  repository.close()
})

test('동기화 스케줄은 한국시간 새벽 시각을 가리킨다', () => {
  // 2026-09-19T19:00:00Z = 한국시간 09-20 04:00
  const delay = millisecondsUntilNextRun(4, 10, new Date('2026-09-19T19:00:00Z'))
  assert.equal(delay, 10 * 60 * 1000)

  const nextDay = millisecondsUntilNextRun(4, 10, new Date('2026-09-19T19:20:00Z'))
  assert.equal(nextDay, 24 * 60 * 60 * 1000 - 10 * 60 * 1000)
})

test('설정 해석이 공유 키와 개별 키를 모두 받는다', () => {
  const shared = resolveOpenDataConfig({ DATA_GO_KR_SERVICE_KEY: 'shared' })
  assert.equal(shared.shelter.key, 'shared')
  assert.equal(shared.welfare.key, 'shared')
  assert.equal(shared.shelter.enabled, true)

  const split = resolveOpenDataConfig({ HAVEN_SHELTER_API_KEY: 'a', HAVEN_WELFARE_API_KEY: 'b' })
  assert.equal(split.shelter.key, 'a')
  assert.equal(split.welfare.key, 'b')

  const none = resolveOpenDataConfig({})
  assert.equal(none.shelter.enabled, false)
  assert.equal(none.youthPolicy.enabled, false)
})
