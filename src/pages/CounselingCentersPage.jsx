import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { LocateFixed, Navigation, Phone } from 'lucide-react'
import FeatureHeader from '../components/FeatureHeader.jsx'
import { DEFAULT_CENTER } from '../constants.js'
import centers from '../data/counselingCenters.json'
import { buildKakaoDirectionsUrl, geolocationErrorMessage, requestCurrentPosition } from '../kakaoDirections.js'
import { loadKakaoMaps } from '../loadKakaoMaps.js'
import { distanceKm, formatDistance } from '../utils.js'

function CenterMap({ origin, nearby, located }) {
  const container = useRef(null)
  const [ready, setReady] = useState(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let active = true
    loadKakaoMaps().then((maps) => {
      if (!active) return
      const map = new maps.Map(container.current, { center: new maps.LatLng(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng), level: 7 })
      setReady({ maps, map })
    }).catch(() => { if (active) setFailed(true) })
    return () => { active = false }
  }, [])
  useEffect(() => {
    if (!ready) return
    const { maps, map } = ready
    const point = new maps.LatLng(origin.lat, origin.lng)
    map.setCenter(point)
    const sproutPin = new maps.MarkerImage('/icons/help/counseling-center-sprout.png', new maps.Size(36, 48), {
      offset: new maps.Point(18, 48),
    })
    const markers = nearby.map((center) => {
      const marker = new maps.Marker({ map, title: center.name, position: new maps.LatLng(center.lat, center.lng), image: sproutPin })
      const select = () => document.getElementById(center.name)?.focus()
      maps.event.addListener(marker, 'click', select)
      return { marker, select }
    })
    const locationDot = located && new maps.Circle({ map, center: point, radius: 45, strokeWeight: 3, strokeColor: '#fff', fillColor: '#477fbe', fillOpacity: 1 })
    return () => {
      markers.forEach(({ marker, select }) => {
        maps.event.removeListener(marker, 'click', select)
        marker.setMap(null)
      })
      if (locationDot) locationDot.setMap(null)
    }
  }, [origin, nearby, located, ready])
  return <>
    <div className="counseling-center-map" ref={container} hidden={failed} aria-label="가까운 청소년상담복지센터 지도" />
    {failed && <p>지도를 불러오지 못했어요. 아래 목록에서 센터의 주소와 길 찾기를 확인할 수 있어요.</p>}
  </>
}

export default function CounselingCentersPage({ onQuickExit }) {
  const { state } = useLocation()
  const [position, setPosition] = useState(null)
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState('')
  const origin = position || DEFAULT_CENTER
  const nearby = useMemo(() => centers.map((center) => ({ ...center, distance: distanceKm(origin, center) }))
    .sort((a, b) => a.distance - b.distance).slice(0, 10), [origin])

  async function locate() {
    setLocating(true)
    setError('')
    try {
      let point
      try {
        point = await requestCurrentPosition(navigator.geolocation, { enableHighAccuracy: true, timeout: 7000, maximumAge: 0 })
      } catch (firstError) {
        if (firstError.code !== 2 && firstError.code !== 3) throw firstError
        point = await requestCurrentPosition(navigator.geolocation, { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 })
      }
      setPosition(point)
    } catch (reason) {
      setError(geolocationErrorMessage(reason))
    } finally {
      setLocating(false)
    }
  }

  return <div className="feature-shell legal-shell plain-back-arrow">
    <FeatureHeader title="청소년상담복지센터" backTo={state?.topicId ? `/family-help/${encodeURIComponent(state.topicId)}` : '/family-help'} backState={{ from: state?.from }} onQuickExit={onQuickExit} />
    <main className="legal-main family-main center-finder">
      <div className="center-finder-heading">
        <h1>가까운 상담복지센터</h1>
        <button type="button" className="help-secondary" onClick={locate} disabled={locating}><LocateFixed size={16} /> {locating ? '찾는 중…' : '내 위치'}</button>
      </div>
      <p role="status">{position ? '내 위치' : '서울시청'}에서 가까운 순서예요. {error}</p>
      <CenterMap origin={origin} nearby={nearby} located={Boolean(position)} />
      <ol className="center-results">
        {nearby.map((center) => <li key={center.name} id={center.name} tabIndex={-1}>
          <div><strong>{center.name}</strong><small>{formatDistance(center.distance)}</small></div>
          <p>{center.address}</p>
          <div className="center-links">
            <a href={`tel:${center.phone.replace(/-/g, '')}`}><Phone size={14} /> {center.phone}</a>
            <a href={buildKakaoDirectionsUrl({ shelter: center })} target="_blank" rel="noreferrer"><Navigation size={14} /> 길 찾기</a>
          </div>
        </li>)}
      </ol>
      <a className="help-text-link" href="https://www.data.go.kr/data/15088388/fileData.do" target="_blank" rel="noreferrer">자료 출처 · 한국청소년상담복지개발원</a>
    </main>
  </div>
}
