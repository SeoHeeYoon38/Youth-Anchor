const DEFAULT_GEOLOCATION_OPTIONS = {
  enableHighAccuracy: true,
  timeout: 15000,
  maximumAge: 0
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

export function buildKakaoDirectionsUrl({ shelter, origin }) {
  const destinationLocation = coordinates(shelter)
  const destination = placeSegment(shelter?.name || '대피처', shelter)
  const currentOrigin = coordinates(origin)

  if (!currentOrigin) return `https://map.kakao.com/link/to/${destination}`

  return `https://m.map.kakao.com/scheme/route?sp=${currentOrigin.lat},${currentOrigin.lng}&ep=${destinationLocation.lat},${destinationLocation.lng}&by=car`
}

export function geolocationErrorMessage(error) {
  if (error?.code === 1) return '위치 권한이 차단되어 있어요. 브라우저의 사이트 설정에서 위치를 허용한 뒤 다시 눌러 주세요.'
  if (error?.code === 2) return '현재 위치를 확인할 수 없어요. 휴대폰의 위치 서비스를 켠 뒤 다시 눌러 주세요.'
  if (error?.code === 3) return '현재 위치 확인 시간이 초과됐어요. 위치 서비스를 확인한 뒤 다시 눌러 주세요.'
  return '현재 위치를 불러오지 못했어요. 위치 권한을 확인한 뒤 다시 눌러 주세요.'
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
