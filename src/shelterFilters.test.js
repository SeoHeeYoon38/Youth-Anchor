import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import {
  DEFAULT_SHELTER_FILTER,
  SHELTER_AUDIENCE_FILTERS,
  SHELTER_TYPE_FILTERS,
  describeFilter,
  filterShelters,
  isFilterActive,
  searchShelters
} from './shelterFilters.js'
import { MARKER_LEGEND, markerStyleFor } from './shelterMarkers.js'

const SAMPLE = [
  { id: 1, name: '일시-누구나', type: '일시쉼터', gender: '누구나' },
  { id: 2, name: '단기-여성', type: '단기쉼터', gender: '여성' },
  { id: 3, name: '단기-남성', type: '단기쉼터', gender: '남성' },
  { id: 4, name: '중장기-여성', type: '중장기쉼터', gender: '여성' },
  { id: 5, name: '이동-누구나', type: '이동쉼터', gender: '누구나' }
]

test('기본 조건은 전체를 보여준다', () => {
  assert.equal(filterShelters(SAMPLE, DEFAULT_SHELTER_FILTER).length, 5)
  assert.equal(isFilterActive(DEFAULT_SHELTER_FILTER), false)
  assert.equal(describeFilter(DEFAULT_SHELTER_FILTER), '전체')
})

test('유형 조건이 적용된다', () => {
  const names = filterShelters(SAMPLE, { type: '단기쉼터', audience: '전체' }).map((item) => item.name)
  assert.deepEqual(names, ['단기-여성', '단기-남성'])
})

test('여성을 고르면 여성 전용과 성별 제한 없는 곳이 함께 나온다', () => {
  const names = filterShelters(SAMPLE, { type: '전체', audience: '여성' }).map((item) => item.name)
  assert.deepEqual(names, ['일시-누구나', '단기-여성', '중장기-여성', '이동-누구나'])
  // 남성 전용은 제외돼야 한다.
  assert.ok(!names.includes('단기-남성'))
})

test('누구나를 고르면 성별 제한 없는 곳만 나온다', () => {
  const names = filterShelters(SAMPLE, { type: '전체', audience: '누구나' }).map((item) => item.name)
  assert.deepEqual(names, ['일시-누구나', '이동-누구나'])
})

test('유형과 이용 대상을 함께 걸 수 있다', () => {
  const names = filterShelters(SAMPLE, { type: '단기쉼터', audience: '여성' }).map((item) => item.name)
  assert.deepEqual(names, ['단기-여성'])

  const empty = filterShelters(SAMPLE, { type: '중장기쉼터', audience: '남성' })
  assert.equal(empty.length, 0)
})

test('조건 설명과 활성 여부가 화면 표시와 맞는다', () => {
  assert.equal(describeFilter({ type: '단기쉼터', audience: '여성' }), '여성 · 단기쉼터')
  assert.equal(describeFilter({ type: '단기쉼터', audience: '전체' }), '단기쉼터')
  assert.equal(isFilterActive({ type: '전체', audience: '여성' }), true)
})

test('잘못된 입력에도 깨지지 않는다', () => {
  assert.deepEqual(filterShelters(null), [])
  assert.deepEqual(filterShelters(undefined, { type: '단기쉼터' }), [])
  assert.equal(filterShelters(SAMPLE, null).length, 5)
  assert.deepEqual(searchShelters(null, '서울'), [])
})

test('지도 검색은 이름 주소 유형 대상 운영 정보와 특징을 함께 찾는다', () => {
  const shelters = [
    {
      id: 1,
      name: '서울시립용산일시청소년쉼터',
      address: '서울 용산구 한강대로 100',
      type: '일시쉼터',
      gender: '누구나',
      open: '24시간',
      phone: '1388',
      features: ['단기 보호', '식사']
    },
    {
      id: 2,
      name: '늘푸른 청소년쉼터',
      address: '경기 수원시',
      type: '중장기쉼터',
      gender: '여성',
      open: '평일 상담',
      features: ['자립 지원']
    }
  ]

  assert.deepEqual(searchShelters(shelters, '용산').map((item) => item.id), [1])
  assert.deepEqual(searchShelters(shelters, '한강 대로').map((item) => item.id), [1])
  assert.deepEqual(searchShelters(shelters, '24시간').map((item) => item.id), [1])
  assert.deepEqual(searchShelters(shelters, '자립지원').map((item) => item.id), [2])
  assert.deepEqual(searchShelters(shelters, '여성').map((item) => item.id), [2])
  assert.equal(searchShelters(shelters, '   ').length, 2)
})

test('필터 선택지가 실제 데이터 값과 일치한다', async () => {
  const raw = await readFile(new URL('../server/seed/shelters.json', import.meta.url), 'utf8')
  const seeds = JSON.parse(raw)

  const types = new Set(seeds.map((shelter) => shelter.type))
  const genders = new Set(seeds.map((shelter) => shelter.gender))

  // 선택지에 없는 값이 데이터에 있으면 그 쉼터는 어떤 조건으로도 찾을 수 없다.
  for (const type of types) assert.ok(SHELTER_TYPE_FILTERS.includes(type), `유형 선택지에 없음: ${type}`)
  for (const gender of genders) assert.ok(SHELTER_AUDIENCE_FILTERS.includes(gender), `대상 선택지에 없음: ${gender}`)

  // 각 유형 조건이 최소 한 곳은 찾아야 한다.
  for (const type of SHELTER_TYPE_FILTERS.filter((item) => item !== '전체')) {
    assert.ok(filterShelters(seeds, { type, audience: '전체' }).length > 0, `결과 없음: ${type}`)
  }
  for (const audience of SHELTER_AUDIENCE_FILTERS.filter((item) => item !== '전체')) {
    assert.ok(filterShelters(seeds, { type: '전체', audience }).length > 0, `결과 없음: ${audience}`)
  }
})

test('마커 색상이 유형마다 고정되고 서로 겹치지 않는다', () => {
  assert.equal(markerStyleFor({ type: '일시쉼터' }).tone, 'coral')
  assert.equal(markerStyleFor({ type: '이동쉼터' }).tone, 'yellow')
  assert.equal(markerStyleFor({ type: '단기쉼터' }).tone, 'green')
  assert.equal(markerStyleFor({ type: '중장기쉼터' }).tone, 'purple')

  // 같은 유형은 몇 번째로 그려지든 같은 색이어야 한다.
  assert.equal(markerStyleFor(SAMPLE[1]).tone, markerStyleFor(SAMPLE[2]).tone)

  const tones = MARKER_LEGEND.map((item) => item.tone)
  assert.equal(new Set(tones).size, tones.length, '색이 중복됩니다')
  assert.equal(MARKER_LEGEND.length, 4)
})

test('유형을 모르는 쉼터도 지도에서 빠지지 않는다', () => {
  const fallback = markerStyleFor({ type: undefined })
  assert.ok(fallback.tone)
  assert.ok(fallback.description)
  assert.equal(markerStyleFor(null).tone, fallback.tone)
})

test('모든 동봉 쉼터가 색 기준을 가진다', async () => {
  const raw = await readFile(new URL('../server/seed/shelters.json', import.meta.url), 'utf8')
  const seeds = JSON.parse(raw)
  const known = new Set(MARKER_LEGEND.map((item) => item.type))
  for (const shelter of seeds) {
    assert.ok(known.has(shelter.type), `${shelter.name}: 기준 없는 유형 ${shelter.type}`)
  }
})
