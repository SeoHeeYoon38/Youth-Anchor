import assert from 'node:assert/strict'
import test from 'node:test'
import { shelterStatusRegion, statusRegionName } from '../shared/shelterStatus.js'
import { fetchShelterStatus, loadShelterStatus } from '../server/opendata/shelterStatus.js'

test('KYCI가 제공하는 모든 지역 탭을 시·도명과 약칭으로 연결한다', () => {
  const regions = ['서울특별시', '부산광역시', '대구광역시', '인천광역시', '광주광역시', '대전광역시', '울산광역시',
    '경기도', '강원특별자치도', '충청북도', '충청남도', '전북특별자치도', '전라남도', '경상북도', '경상남도', '제주특별자치도']
  const shortNames = ['서울', '부산', '대구', '인천', '광주', '대전', '울산', '경기', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주']
  for (const [index, region] of regions.entries()) {
    const id = shelterStatusRegion({ region: ` ${region} 시군구` })
    assert.equal(id, String(index + 1))
    assert.equal(statusRegionName(String(index + 1)), shortNames[index])
    assert.equal(shelterStatusRegion({ address: `${shortNames[index]} 시군구 도로명` }), id)
  }
  assert.equal(shelterStatusRegion({ address: '전라북도 전주시' }), shelterStatusRegion({ region: '전북특별자치도' }))
  assert.equal(shelterStatusRegion({ region: '경기도 광주시', address: '광주시' }), shelterStatusRegion({ region: '경기' }))
  assert.equal(shelterStatusRegion({ region: '세종특별자치시' }), null)
  assert.equal(shelterStatusRegion({}), null)
  assert.equal(statusRegionName('17'), undefined)
})

test('정원과 현원, 입소 판단을 공식 표기 그대로 읽는다', async () => {
  const fragment = '<li data-id="tj10"><span id="list_Name"><b>[서구]</b> 쉼터</span><b id="list_Limit">10</b><strong id="list_Now">0</strong><strong id="list_Enter">입소불가</strong></li>'
  const { items } = await fetchShelterStatus('6', (url) => {
    assert.equal(url.searchParams.get('local'), '6')
    return new Response(fragment)
  })
  assert.deepEqual(items, [{ id: 'tj10', name: '[서구] 쉼터', capacity: 10, residents: 0, status: '입소불가' }])
  await assert.rejects(fetchShelterStatus('6', () => new Response('<html>점검 중</html>')))
})

test('직접 조회가 실패하면 같은 지역을 다시 조회하고 원래 조회 시각을 유지한다', async () => {
  const data = { items: [{ id: 'tj10', residents: 0 }], checkedAt: '2026-11-25T09:00:00Z' }
  const status = await loadShelterStatus('6', (url) => {
    if (url.hostname === 'www.kyci.or.kr') return new Response(null, { status: 503 })
    assert.equal(url.href, 'https://haven-youth-anchor.vercel.app/api/shelter-status?region=6')
    return Response.json(data)
  })
  assert.deepEqual(status, data)
  await assert.rejects(loadShelterStatus('6', () => new Response(null, { status: 503 })))
})
