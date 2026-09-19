import { useEffect, useMemo, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { fetchShelters, fetchSupports } from './api.js'
import { GuideSheet, NoticeSheet, ShelterSheet, SupportSheet } from './components/Sheets.jsx'
import { DEFAULT_CENTER } from './constants.js'
import { shelters as fallbackShelters, supports as fallbackSupports } from './data.js'
import HavenLayout from './layouts/HavenLayout.jsx'
import ChatPage from './pages/ChatPage.jsx'
import HomePage from './pages/HomePage.jsx'
import SheltersPage from './pages/SheltersPage.jsx'
import SupportPage from './pages/SupportPage.jsx'
import WelcomePage from './pages/WelcomePage.jsx'
import { distanceKm } from './utils.js'

export default function App() {
  const [position, setPosition] = useState(null)
  const [shelterItems, setShelterItems] = useState(fallbackShelters)
  const [supportItems, setSupportItems] = useState(fallbackSupports)
  const [locating, setLocating] = useState(false)
  const [locationMessage, setLocationMessage] = useState('서울시청 주변을 기준으로 보여드려요')
  const [selectedShelter, setSelectedShelter] = useState(null)
  const [selectedSupport, setSelectedSupport] = useState(null)
  const [noticeOpen, setNoticeOpen] = useState(false)
  const [guideOpen, setGuideOpen] = useState(false)

  useEffect(() => {
    let active = true
    fetchShelters(position)
      .then((items) => {
        if (active && Array.isArray(items) && items.length > 0) setShelterItems(items)
      })
      .catch(() => {})
    return () => { active = false }
  }, [position])

  useEffect(() => {
    let active = true
    fetchSupports()
      .then((items) => {
        if (active && Array.isArray(items) && items.length > 0) setSupportItems(items)
      })
      .catch(() => {})
    return () => { active = false }
  }, [])

  const sortedShelters = useMemo(() => {
    const origin = position || DEFAULT_CENTER
    return shelterItems
      .map((shelter) => ({ ...shelter, distance: distanceKm(origin, shelter) }))
      .sort((a, b) => a.distance - b.distance)
  }, [position, shelterItems])

  const locateMe = () => {
    if (!navigator.geolocation) {
      setLocationMessage('이 브라우저에서는 위치 찾기를 지원하지 않아요')
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setPosition({ lat: coords.latitude, lng: coords.longitude })
        setLocationMessage('현재 위치에서 가까운 순서예요')
        setLocating(false)
      },
      () => {
        setLocationMessage('위치 권한 없이도 대피처를 확인할 수 있어요')
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    )
  }

  const quickExit = async () => {
    document.title = '새 탭'
    try {
      localStorage.clear()
      sessionStorage.clear()
      if ('caches' in window) {
        const keys = await caches.keys()
        await Promise.all(keys.map((key) => caches.delete(key)))
      }
    } finally {
      window.location.replace('https://www.google.com/')
    }
  }

  return (
    <>
      <Routes>
        <Route path="/" element={<WelcomePage onQuickExit={quickExit} />} />
        <Route element={<HavenLayout onQuickExit={quickExit} onNotice={() => setNoticeOpen(true)} />}>
          <Route path="/home" element={<HomePage shelters={sortedShelters} locationMessage={locationMessage} locateMe={locateMe} locating={locating} onSelectShelter={setSelectedShelter} onOpenGuide={() => setGuideOpen(true)} />} />
          <Route path="/shelters" element={<SheltersPage shelters={sortedShelters} position={position} locationMessage={locationMessage} locateMe={locateMe} locating={locating} onSelectShelter={setSelectedShelter} />} />
          <Route path="/chat" element={<ChatPage onQuickExit={quickExit} />} />
          <Route path="/support" element={<SupportPage supports={supportItems} onSelect={setSelectedSupport} />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {selectedShelter && <ShelterSheet shelter={selectedShelter} onClose={() => setSelectedShelter(null)} />}
      {selectedSupport && <SupportSheet support={selectedSupport} onClose={() => setSelectedSupport(null)} />}
      {noticeOpen && <NoticeSheet onClose={() => setNoticeOpen(false)} />}
      {guideOpen && <GuideSheet onClose={() => setGuideOpen(false)} />}
    </>
  )
}
