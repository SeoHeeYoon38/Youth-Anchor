import { statusRegionName } from '../shared/shelterStatus.js'
import { fetchShelterStatus } from '../server/opendata/shelterStatus.js'

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET')
    return response.status(405).end()
  }
  const region = request.query.region
  if (typeof region !== 'string' || !statusRegionName(region)) {
    return response.status(404).json({ error: 'unknown-region' })
  }
  try {
    const status = await fetchShelterStatus(region)
    response.setHeader('Cache-Control', 'public, max-age=0, s-maxage=60')
    return response.status(200).json(status)
  } catch (error) {
    console.warn('공식 입소 현황 조회 실패', region, error.cause?.code || error.message)
    return response.status(502).json({ error: 'shelter-status-unavailable' })
  }
}
