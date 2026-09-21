import { useEffect, useMemo, useRef, useState } from 'react'
import { DEFAULT_CENTER } from '../constants.js'
import { MARKER_LEGEND, markerStyleFor } from '../shelterMarkers.js'

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

/** 마커 DOM은 지도용과 미리보기용이 같은 모양이어야 해서 한 곳에서 만든다. */
function createMarkerElement(shelter, onSelect, offset = { x: 0, y: 0 }) {
  const style = markerStyleFor(shelter)
  const element = document.createElement('button')
  const pin = document.createElement('span')
  const label = document.createElement('span')

  element.type = 'button'
  element.className = `haven-map-marker marker-${style.tone}`
  element.style.setProperty('--marker-offset-x', `${offset.x}px`)
  element.style.setProperty('--marker-offset-y', `${offset.y}px`)
  element.setAttribute('aria-label', `${shelter.name} · ${style.title} 위치`)
  element.title = `${style.title} — ${style.description}`
  pin.className = 'marker-pin'
  pin.dataset.symbol = style.symbol
  label.className = 'marker-label'
  label.textContent = style.label
  element.append(pin, label)
  element.addEventListener('click', () => onSelect(shelter))

  return element
}

function markerCoordinateKey(shelter) {
  return `${Number(shelter.lat).toFixed(3)}:${Number(shelter.lng).toFixed(3)}`
}

function spreadMarkerOffset(index, total) {
  if (total < 2) return { x: 0, y: 0 }

  const markersPerRing = 8
  const ring = Math.floor(index / markersPerRing)
  const ringIndex = index % markersPerRing
  const ringTotal = Math.min(markersPerRing, total - ring * markersPerRing)
  const angle = (Math.PI * 2 * ringIndex) / ringTotal
  const radius = 58 * (ring + 1)

  return {
    x: Math.round(Math.cos(angle) * radius),
    y: Math.round(Math.sin(angle) * radius)
  }
}

export default function KakaoMap({ position, shelters, onSelectShelter }) {
  const mapElement = useRef(null)
  const mapInstance = useRef(null)
  const mapsApi = useRef(null)
  const overlays = useRef([])
  const locationCircle = useRef(null)
  const selectHandler = useRef(onSelectShelter)
  const [status, setStatus] = useState(KAKAO_MAP_APP_KEY ? 'loading' : 'missing-key')
  const markerItems = useMemo(() => {
    const groupCounts = new Map()
    shelters.forEach((shelter) => {
      const key = markerCoordinateKey(shelter)
      groupCounts.set(key, (groupCounts.get(key) || 0) + 1)
    })

    const seenCounts = new Map()
    return shelters.map((shelter) => {
      const key = markerCoordinateKey(shelter)
      const seen = seenCounts.get(key) || 0
      seenCounts.set(key, seen + 1)

      return {
        shelter,
        offset: spreadMarkerOffset(seen, groupCounts.get(key) || 1)
      }
    })
  }, [shelters])

  // 마커 클릭 처리는 최신 콜백을 쓰되, 콜백 변경만으로 지도를 다시 만들지 않는다.
  useEffect(() => {
    selectHandler.current = onSelectShelter
  }, [onSelectShelter])

  // 지도는 한 번만 만든다. 조건을 바꿀 때마다 새로 만들면 확대 수준과 위치가 초기화된다.
  useEffect(() => {
    let cancelled = false

    loadKakaoMaps()
      .then((maps) => {
        if (cancelled || !mapElement.current) return
        const center = position || DEFAULT_CENTER
        mapsApi.current = maps
        mapInstance.current = new maps.Map(mapElement.current, {
          center: new maps.LatLng(center.lat, center.lng),
          // 안양 쉼터들이 한 화면에 함께 보이도록 초기 지도 범위를 넓힌다.
          level: 7
        })
        setStatus('ready')
      })
      .catch((error) => {
        if (!cancelled) setStatus(error.message === 'missing-key' ? 'missing-key' : 'error')
      })

    return () => {
      cancelled = true
      overlays.current.forEach((overlay) => overlay.setMap(null))
      overlays.current = []
      locationCircle.current?.setMap(null)
      locationCircle.current = null
      mapInstance.current = null
    }
    // 최초 1회만 실행한다. position 초기값은 아래 효과에서 다시 반영한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 필터 결과가 바뀌면 마커만 교체한다.
  useEffect(() => {
    const maps = mapsApi.current
    const map = mapInstance.current
    if (!maps || !map) return

    overlays.current.forEach((overlay) => overlay.setMap(null))
    overlays.current = markerItems.map(({ shelter, offset }) => new maps.CustomOverlay({
      map,
      position: new maps.LatLng(shelter.lat, shelter.lng),
      content: createMarkerElement(shelter, (item) => selectHandler.current?.(item), offset),
      yAnchor: 1.12
    }))
  }, [markerItems, status])

  // 내 위치가 잡히면 지도 중심과 현재 위치 표시를 갱신한다.
  useEffect(() => {
    const maps = mapsApi.current
    const map = mapInstance.current
    if (!maps || !map || !position) return

    const center = new maps.LatLng(position.lat, position.lng)
    map.setCenter(center)
    locationCircle.current?.setMap(null)
    locationCircle.current = new maps.Circle({
      map,
      center,
      radius: 34,
      strokeWeight: 5,
      strokeColor: '#ffffff',
      strokeOpacity: 1,
      fillColor: '#7398d2',
      fillOpacity: 0.92
    })
  }, [position, status])

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
              const style = markerStyleFor(shelter)
              return (
                <button
                  className={`haven-map-marker marker-${style.tone} fallback-marker-${index + 1}`}
                  key={shelter.id}
                  onClick={() => onSelectShelter(shelter)}
                  aria-label={`${shelter.name} 상세 보기`}
                  title={`${style.title} — ${style.description}`}
                >
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
      <div className="map-legend" aria-label="마커 색상 기준">
        <strong>머물 수 있는 기간</strong>
        <ul>
          {MARKER_LEGEND.map((item) => (
            <li key={item.type}>
              <span className={`legend-dot legend-${item.tone}`} />
              <b>{item.title}</b>
              <small>{item.description}</small>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
