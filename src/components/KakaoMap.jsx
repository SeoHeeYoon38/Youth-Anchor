import { useEffect, useRef, useState } from 'react'
import { DEFAULT_CENTER, MASCOTS } from '../constants.js'

const KAKAO_MAP_APP_KEY = import.meta.env.VITE_KAKAO_MAP_APP_KEY

function loadKakaoMaps() {
  if (!KAKAO_MAP_APP_KEY) return Promise.reject(new Error('missing-key'))
  if (window.kakao?.maps?.Map) return Promise.resolve(window.kakao.maps)
  if (window.__havenKakaoMapsPromise) return window.__havenKakaoMapsPromise

  window.__havenKakaoMapsPromise = new Promise((resolve, reject) => {
    const finishLoading = () => {
      if (!window.kakao?.maps) {
        reject(new Error('sdk-unavailable'))
        return
      }
      window.kakao.maps.load(() => resolve(window.kakao.maps))
    }

    const existingScript = document.querySelector('script[data-haven-kakao-map]')
    if (existingScript && window.kakao?.maps?.load) {
      finishLoading()
      return
    }

    const script = existingScript || document.createElement('script')
    script.addEventListener('load', finishLoading, { once: true })
    script.addEventListener('error', () => reject(new Error('sdk-load-failed')), { once: true })

    if (!existingScript) {
      script.dataset.havenKakaoMap = 'true'
      script.async = true
      script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(KAKAO_MAP_APP_KEY)}&autoload=false`
      document.head.appendChild(script)
    }
  })

  return window.__havenKakaoMapsPromise
}

export default function KakaoMap({ position, shelters, onSelectShelter }) {
  const mapElement = useRef(null)
  const [status, setStatus] = useState(KAKAO_MAP_APP_KEY ? 'loading' : 'missing-key')

  useEffect(() => {
    let cancelled = false
    const markers = []
    let currentLocation = null

    loadKakaoMaps()
      .then((maps) => {
        if (cancelled || !mapElement.current) return

        const center = position || DEFAULT_CENTER
        const map = new maps.Map(mapElement.current, {
          center: new maps.LatLng(center.lat, center.lng),
          level: 5
        })

        shelters.forEach((shelter) => {
          const marker = new maps.Marker({
            map,
            position: new maps.LatLng(shelter.lat, shelter.lng),
            title: shelter.name
          })
          maps.event.addListener(marker, 'click', () => onSelectShelter(shelter))
          markers.push(marker)
        })

        if (position) {
          currentLocation = new maps.Circle({
            map,
            center: new maps.LatLng(position.lat, position.lng),
            radius: 34,
            strokeWeight: 5,
            strokeColor: '#ffffff',
            strokeOpacity: 1,
            fillColor: '#7398d2',
            fillOpacity: 0.92
          })
        }

        setStatus('ready')
      })
      .catch((error) => {
        if (!cancelled) setStatus(error.message === 'missing-key' ? 'missing-key' : 'error')
      })

    return () => {
      cancelled = true
      markers.forEach((marker) => marker.setMap(null))
      currentLocation?.setMap(null)
    }
  }, [onSelectShelter, position, shelters])

  const title = status === 'loading'
    ? '카카오맵을 불러오고 있어요'
    : status === 'missing-key'
      ? '지도 연결을 준비하고 있어요'
      : '지도를 불러오지 못했어요'

  return (
    <div className="map-wrap page-enter">
      <div ref={mapElement} className="kakao-map" aria-label="카카오맵 대피처 지도" />
      {status !== 'ready' && (
        <div className="map-fallback" role="status">
          <img className="mascot-float" src={MASCOTS.guide} alt="길을 안내하는 가온" />
          <strong>{title}</strong>
          <p>아래 목록에서는 가까운 대피처를 바로 확인할 수 있어요.</p>
        </div>
      )}
      {status === 'ready' && <div className="map-legend"><span /> 이용 가능한 대피처</div>}
      <div className="map-companion" aria-hidden="true">
        <img src={MASCOTS.guide} alt="" />
        <span>가온 헬퍼</span>
      </div>
    </div>
  )
}
