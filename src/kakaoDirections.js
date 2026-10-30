const DEFAULT_GEOLOCATION_OPTIONS = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 60000
}

function coordinates(point) {
  const lat = Number(point?.lat)
  const lng = Number(point?.lng)
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null
}

function placeSegment(name, point) {
  const location = coordinates(point)
  if (!location) throw new Error('invalid-kakao-map-coordinates')
  return `${encodeURIComponent(name || '위치')},${location.lat},${location.lng}`
}

export function buildKakaoDirectionsUrl({ shelter, origin, originName = '현재 위치' }) {
  const destination = placeSegment(shelter?.name || '대피처', shelter)
  const currentOrigin = coordinates(origin)

  if (!currentOrigin) return `https://map.kakao.com/link/to/${destination}`

  return `https://map.kakao.com/link/from/${placeSegment(originName, currentOrigin)}/to/${destination}`
}

export function requestCurrentPosition(geolocation, options = DEFAULT_GEOLOCATION_OPTIONS) {
  return new Promise((resolve, reject) => {
    if (!geolocation?.getCurrentPosition) {
      reject(new Error('geolocation-unavailable'))
      return
    }

    geolocation.getCurrentPosition(
      ({ coords }) => resolve({ lat: coords.latitude, lng: coords.longitude }),
      reject,
      options
    )
  })
}
