import { useEffect, useRef, useState } from 'react'
import { DEFAULT_CENTER } from '../constants.js'
import Mascot from './Mascot.jsx'

const KAKAO_MAP_APP_KEY = import.meta.env.VITE_KAKAO_MAP_APP_KEY
const MARKER_TONES = [
  { tone: 'green', symbol: '집', label: 'Open' },
  { tone: 'yellow', symbol: '손', label: 'Open' },
  { tone: 'coral', symbol: 'SOS', label: '긴급 대피처' },
  { tone: 'purple', symbol: '쉼', label: 'Open' }
]

function markerStyle(shelter, index) {
  if (shelter.status === '마감 임박') return MARKER_TONES[2]
  return MARKER_TONES[index % MARKER_TONES.length]
}

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

        shelters.forEach((shelter, index) => {
          const style = markerStyle(shelter, index)
          const content = document.createElement('button')
          const pin = document.createElement('span')
          const label = document.createElement('span')
          content.type = 'button'
          content.className = `haven-map-marker marker-${style.tone}`
          content.setAttribute('aria-label', `${shelter.name} ${shelter.status}`)
          pin.className = 'marker-pin'
          pin.dataset.symbol = style.symbol
          label.className = 'marker-label'
          label.textContent = style.label
          content.append(pin, label)
          content.addEventListener('click', () => onSelectShelter(shelter))

          const marker = new maps.CustomOverlay({
            map,
            position: new maps.LatLng(shelter.lat, shelter.lng),
            content,
            yAnchor: 1.12
          })
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
          <div className="fallback-markers" aria-label="대피처 위치 미리보기">
            {shelters.slice(0, 4).map((shelter, index) => {
              const style = markerStyle(shelter, index)
              return (
                <button className={`haven-map-marker marker-${style.tone} fallback-marker-${index + 1}`} key={shelter.id} onClick={() => onSelectShelter(shelter)} aria-label={`${shelter.name} 상세 보기`}>
                  <span className="marker-pin" data-symbol={style.symbol} />
                  <span className="marker-label">{style.label}</span>
                </button>
              )
            })}
          </div>
          <div className="map-fallback-message">
            <strong>{title}</strong>
            <p>아래 목록에서는 가까운 대피처를 바로 확인할 수 있어요.</p>
          </div>
        </div>
      )}
      {status === 'ready' && <div className="map-legend"><span /> 이용 가능한 대피처</div>}
      <div className="map-companion" aria-hidden="true">
        <Mascot pose="guide" />
        <span className="map-companion-label">가온 헬퍼</span>
      </div>
    </div>
  )
}
