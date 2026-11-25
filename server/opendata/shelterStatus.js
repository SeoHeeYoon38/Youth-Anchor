import { parse } from 'node-html-parser'
import { statusRegionName } from '../../shared/shelterStatus.js'

function peopleCount(row, selector) {
  const value = row.querySelector(selector)?.text.trim()
  return /^\d+$/.test(value) ? Number(value) : null
}

export async function fetchShelterStatus(region, fetchImpl = fetch) {
  if (!statusRegionName(region)) throw new Error('unknown-region')
  const url = new URL('https://www.kyci.or.kr/Shelter/shelter_list.new.asp')
  url.searchParams.set('local', region)
  const response = await fetchImpl(url, { signal: AbortSignal.timeout(6500) })
  if (!response.ok) throw new Error(`kyci-http-${response.status}`)
  const root = parse(await response.text())
  const items = root.querySelectorAll('li[data-id]').map((row) => {
    const name = row.querySelector('#list_Name')?.text.trim()
    if (!name) throw new Error('unexpected-kyci-response')
    return {
      id: row.getAttribute('data-id'),
      name,
      capacity: peopleCount(row, '#list_Limit'),
      residents: peopleCount(row, '#list_Now'),
      status: row.querySelector('#list_Enter')?.text.trim() || '기관에 문의'
    }
  })
  // An empty or redesigned upstream response cannot establish that a region has no shelters.
  if (!items.length) throw new Error('unexpected-kyci-response')
  return { items, checkedAt: new Date().toISOString() }
}

export async function loadShelterStatus(region, fetchImpl = fetch) {
  if (!statusRegionName(region)) throw new Error('unknown-region')
  try {
    return await fetchShelterStatus(region, fetchImpl)
  } catch (error) {
    console.warn('공식 입소 현황 직접 조회 실패', region, error.cause?.code || error.message)
    const url = new URL('https://haven-youth-anchor.vercel.app/api/shelter-status')
    url.searchParams.set('region', region)
    const response = await fetchImpl(url, { signal: AbortSignal.timeout(12000) })
    if (!response.ok) throw new Error('shelter-status-unavailable', { cause: error })
    return response.json()
  }
}
