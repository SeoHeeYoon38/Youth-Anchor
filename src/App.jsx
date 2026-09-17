import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Bell,
  Bot,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock3,
  Compass,
  ExternalLink,
  Home,
  LocateFixed,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  UserRoundCheck,
  WalletCards,
  X
} from 'lucide-react'
import { fetchShelters, fetchSupports, requestChatReply } from './api.js'
import { quickReplies, shelters as fallbackShelters, supports as fallbackSupports } from './data.js'

const NAV_ITEMS = [
  { id: 'home', label: '홈', icon: Home },
  { id: 'shelters', label: '대피처', icon: MapPin },
  { id: 'chat', label: '상담', icon: MessageCircle },
  { id: 'support', label: '자립', icon: WalletCards }
]

const DEFAULT_CENTER = [37.5665, 126.978]
const KAKAO_MAP_APP_KEY = import.meta.env.VITE_KAKAO_MAP_APP_KEY

function distanceKm(from, to) {
  const radius = 6371
  const lat = ((to.lat - from.lat) * Math.PI) / 180
  const lng = ((to.lng - from.lng) * Math.PI) / 180
  const a =
    Math.sin(lat / 2) ** 2 +
    Math.cos((from.lat * Math.PI) / 180) *
      Math.cos((to.lat * Math.PI) / 180) *
      Math.sin(lng / 2) ** 2
  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function formatDistance(distance) {
  if (distance < 1) return `${Math.round(distance * 1000)}m`
  return `${distance.toFixed(1)}km`
}

function loadKakaoMaps() {
  if (!KAKAO_MAP_APP_KEY) return Promise.reject(new Error('missing-key'))
  if (window.kakao?.maps?.Map) return Promise.resolve(window.kakao.maps)
  if (window.__helperKakaoMapsPromise) return window.__helperKakaoMapsPromise

  window.__helperKakaoMapsPromise = new Promise((resolve, reject) => {
    const finishLoading = () => {
      if (!window.kakao?.maps) {
        reject(new Error('sdk-unavailable'))
        return
      }
      window.kakao.maps.load(() => resolve(window.kakao.maps))
    }

    const existingScript = document.querySelector('script[data-helper-kakao-map]')
    if (existingScript && window.kakao?.maps?.load) {
      finishLoading()
      return
    }

    const script = existingScript || document.createElement('script')
    script.addEventListener('load', finishLoading, { once: true })
    script.addEventListener('error', () => reject(new Error('sdk-load-failed')), { once: true })

    if (!existingScript) {
      script.dataset.helperKakaoMap = 'true'
      script.async = true
      script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(KAKAO_MAP_APP_KEY)}&autoload=false`
      document.head.appendChild(script)
    }
  })

  return window.__helperKakaoMapsPromise
}

function KakaoMap({ position, shelters: nearby, onSelectShelter }) {
  const mapElement = useRef(null)
  const [status, setStatus] = useState(KAKAO_MAP_APP_KEY ? 'loading' : 'missing-key')

  useEffect(() => {
    let cancelled = false
    const markers = []
    let currentLocation = null

    loadKakaoMaps()
      .then((maps) => {
        if (cancelled || !mapElement.current) return

        const center = position || { lat: DEFAULT_CENTER[0], lng: DEFAULT_CENTER[1] }
        const map = new maps.Map(mapElement.current, {
          center: new maps.LatLng(center.lat, center.lng),
          level: 5
        })

        map.setZoomable(true)
        map.setDraggable(true)

        nearby.forEach((shelter) => {
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
            radius: 35,
            strokeWeight: 4,
            strokeColor: '#ffffff',
            strokeOpacity: 1,
            fillColor: '#2878ff',
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
  }, [nearby, onSelectShelter, position])

  return (
    <div className="map-wrap">
      <div ref={mapElement} className="kakao-map" aria-label="카카오맵 대피처 지도" />
      {status !== 'ready' && (
        <div className="map-fallback">
          <span className="map-fallback-icon"><MapPin size={26} /></span>
          <strong>{status === 'loading' ? '카카오맵을 불러오고 있어요' : '지도 연결을 준비하고 있어요'}</strong>
          <p>{status === 'loading' ? '잠시만 기다려 주세요.' : '아래 목록에서는 대피처를 바로 확인할 수 있어요.'}</p>
        </div>
      )}
      {status === 'ready' && <div className="map-legend"><span></span> 이용 가능 대피처</div>}
    </div>
  )
}

function App() {
  const [activeTab, setActiveTab] = useState('home')
  const [position, setPosition] = useState(null)
  const [shelterItems, setShelterItems] = useState(fallbackShelters)
  const [supportItems, setSupportItems] = useState(fallbackSupports)
  const [locating, setLocating] = useState(false)
  const [locationMessage, setLocationMessage] = useState('서울시청 기준으로 보고 있어요')
  const [selectedShelter, setSelectedShelter] = useState(null)
  const [noticeOpen, setNoticeOpen] = useState(false)

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
        setLocationMessage('위치 권한 없이도 쉼터를 둘러볼 수 있어요')
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    )
  }

  const sortedShelters = useMemo(() => {
    const origin = position || { lat: DEFAULT_CENTER[0], lng: DEFAULT_CENTER[1] }
    return shelterItems
      .map((shelter) => ({ ...shelter, distance: distanceKm(origin, shelter) }))
      .sort((a, b) => a.distance - b.distance)
  }, [position, shelterItems])

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

  const navigate = (tab) => {
    setActiveTab(tab)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => navigate('home')} aria-label="HELPER 홈">
          <span className="brand-mark">H</span>
          <span className="brand-copy">
            <strong>HELPER</strong>
            <small>청소년 안전지원</small>
          </span>
        </button>
        <div className="topbar-actions">
          <button className="icon-button" onClick={() => setNoticeOpen(true)} aria-label="알림 안내">
            <Bell size={20} />
          </button>
          <button className="exit-button" onClick={quickExit}>
            <ExternalLink size={17} />
            빠른 종료
          </button>
        </div>
      </header>

      <main>
        {activeTab === 'home' && (
          <HomeView
            shelters={sortedShelters}
            locationMessage={locationMessage}
            locateMe={locateMe}
            locating={locating}
            navigate={navigate}
            setSelectedShelter={setSelectedShelter}
          />
        )}
        {activeTab === 'shelters' && (
          <ShelterView
            shelters={sortedShelters}
            position={position}
            locationMessage={locationMessage}
            locateMe={locateMe}
            locating={locating}
            setSelectedShelter={setSelectedShelter}
          />
        )}
        {activeTab === 'chat' && <ChatView navigate={navigate} />}
        {activeTab === 'support' && <SupportView supports={supportItems} />}
      </main>

      <nav className="bottom-nav" aria-label="주요 메뉴">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
          <button
            className={activeTab === id ? 'nav-item active' : 'nav-item'}
            key={id}
            onClick={() => navigate(id)}
            aria-current={activeTab === id ? 'page' : undefined}
          >
            <Icon size={21} strokeWidth={activeTab === id ? 2.6 : 2} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      {selectedShelter && (
        <ShelterSheet shelter={selectedShelter} onClose={() => setSelectedShelter(null)} />
      )}
      {noticeOpen && <NoticeSheet onClose={() => setNoticeOpen(false)} />}
    </div>
  )
}

function HomeView({ shelters: nearby, locationMessage, locateMe, locating, navigate, setSelectedShelter }) {
  return (
    <div className="view home-view">
      <section className="welcome-band">
        <span className="eyebrow"><ShieldCheck size={16} /> 로그인 없이 바로 이용해요</span>
        <h1>지금, 어떤 도움이<br />가장 필요한가요?</h1>
        <p>이름이나 연락처를 묻지 않아요. 필요한 도움부터 바로 선택하세요.</p>
      </section>

      <section className="urgent-actions" aria-labelledby="urgent-heading">
        <h2 className="sr-only" id="urgent-heading">긴급 도움</h2>
        <a href="tel:112" className="danger-call">
          <span className="danger-call-icon"><Phone size={23} /></span>
          <span><small>지금 다칠 위험이 있어요</small><strong>112 바로 전화</strong></span>
          <ChevronRight size={20} />
        </a>
        <div className="action-grid">
          <button className="action-tile shelter-action" onClick={() => navigate('shelters')}>
            <span className="action-icon"><MapPin /></span>
            <strong>오늘 잘 곳</strong>
            <span>가까운 대피처 찾기</span>
            <ChevronRight size={18} />
          </button>
          <button className="action-tile chat-action" onClick={() => navigate('chat')}>
            <span className="action-icon"><MessageCircle /></span>
            <strong>조용한 상담</strong>
            <span>익명 채팅 시작하기</span>
            <ChevronRight size={18} />
          </button>
        </div>
        <a href="tel:1388" className="counsel-call">
          <span><Phone size={18} /> 청소년전화 <strong>1388</strong></span>
          <span>24시간 무료 상담 <ChevronRight size={17} /></span>
        </a>
      </section>

      <section className="nearby-section">
        <div className="section-heading inline">
          <div>
            <span className="section-kicker">SOS 대피처</span>
            <h2>내 주변에서 바로 갈 수 있는 곳</h2>
            <p>{locationMessage}</p>
          </div>
          <button className="locate-button" onClick={locateMe} disabled={locating}>
            <LocateFixed size={17} className={locating ? 'spin' : ''} />
            {locating ? '찾는 중' : '내 위치'}
          </button>
        </div>

        <div className="shelter-strip">
          {nearby.slice(0, 3).map((shelter) => (
            <ShelterCard key={shelter.id} shelter={shelter} onClick={() => setSelectedShelter(shelter)} />
          ))}
        </div>
        <button className="text-button" onClick={() => navigate('shelters')}>
          지도에서 모든 대피처 보기 <ChevronRight size={17} />
        </button>
      </section>

      <section className="support-preview">
        <div className="support-visual" aria-hidden="true">
          <Sparkles size={25} />
        </div>
        <div>
          <span className="section-kicker">혼자 준비하지 않아도 돼요</span>
          <h2>월세, 식사, 일자리 지원을<br />한 번에 확인하세요.</h2>
        </div>
        <button onClick={() => navigate('support')} aria-label="자립 지원 정보 보기">
          <ChevronRight />
        </button>
      </section>

      <p className="data-note"><CircleAlert size={14} /> 현재 쉼터 잔여석은 기능 확인용 데모 정보입니다.</p>
    </div>
  )
}

function ShelterCard({ shelter, onClick }) {
  return (
    <button className="shelter-card" onClick={onClick}>
      <div className="shelter-card-top">
        <span className={`status-dot ${shelter.status === '마감 임박' ? 'warning' : ''}`}></span>
        <span className="status-text">{shelter.status}</span>
        <span className="distance">{formatDistance(shelter.distance)}</span>
      </div>
      <strong>{shelter.name}</strong>
      <span className="shelter-meta">{shelter.type} · {shelter.gender} · {shelter.open}</span>
      <div className="tag-row">
        {shelter.features.slice(0, 3).map((feature) => <span key={feature}>{feature}</span>)}
      </div>
      <div className="availability">
        {shelter.beds > 0 ? <><b>{shelter.beds}자리</b> 남았어요</> : <b>현재 운영 중</b>}
        <ChevronRight size={17} />
      </div>
    </button>
  )
}

function ShelterView({ shelters: nearby, position, locationMessage, locateMe, locating, setSelectedShelter }) {
  const [viewMode, setViewMode] = useState('map')
  const [filterOpen, setFilterOpen] = useState(false)
  const [filter, setFilter] = useState('전체')

  const visibleShelters = useMemo(() => {
    if (filter === '전체') return nearby
    if (filter === '이동쉼터') return nearby.filter((shelter) => shelter.type === '이동쉼터')
    return nearby.filter((shelter) => shelter.gender === filter || shelter.gender === '누구나')
  }, [filter, nearby])

  return (
    <div className="view shelter-view">
      <div className="page-title-row">
        <div>
          <span className="section-kicker">SOS 대피처</span>
          <h1>안전한 곳을 찾을게요</h1>
          <p>{locationMessage}</p>
        </div>
        <button className="locate-button compact" onClick={locateMe} disabled={locating} aria-label="현재 위치 찾기">
          <LocateFixed size={19} className={locating ? 'spin' : ''} />
        </button>
      </div>

      <div className="map-toolbar">
        <div className="segmented-control" aria-label="보기 방식">
          <button className={viewMode === 'map' ? 'active' : ''} onClick={() => setViewMode('map')}>지도</button>
          <button className={viewMode === 'list' ? 'active' : ''} onClick={() => setViewMode('list')}>목록</button>
        </div>
        <button
          className={filterOpen ? 'filter-button active' : 'filter-button'}
          onClick={() => setFilterOpen((open) => !open)}
          aria-expanded={filterOpen}
        >
          <SlidersHorizontal size={17} /> 조건
        </button>
      </div>

      {filterOpen && (
        <div className="filter-row" aria-label="대피처 이용 조건">
          {['전체', '누구나', '여성', '남성', '이동쉼터'].map((item) => (
            <button
              key={item}
              className={filter === item ? 'active' : ''}
              onClick={() => setFilter(item)}
            >
              {filter === item && <Check size={14} />}
              {item}
            </button>
          ))}
        </div>
      )}

      {viewMode === 'map' ? (
        <KakaoMap position={position} shelters={visibleShelters} onSelectShelter={setSelectedShelter} />
      ) : (
        <div className="shelter-list">
          {visibleShelters.map((shelter) => (
            <ShelterCard key={shelter.id} shelter={shelter} onClick={() => setSelectedShelter(shelter)} />
          ))}
        </div>
      )}

      {visibleShelters.length === 0 && (
        <div className="empty-state">
          <MapPin size={25} />
          <strong>조건에 맞는 대피처가 없어요</strong>
          <p>다른 조건을 선택해 주세요.</p>
        </div>
      )}

      {viewMode === 'map' && visibleShelters.length > 0 && (
        <section className="map-results">
          <div className="results-heading">
            <strong>가까운 순</strong>
            <span>{visibleShelters.length}곳</span>
          </div>
          {visibleShelters.slice(0, 3).map((shelter) => (
            <button className="result-row" key={shelter.id} onClick={() => setSelectedShelter(shelter)}>
              <span className="result-icon"><MapPin size={20} /></span>
              <span className="result-copy">
                <strong>{shelter.name}</strong>
                <small>{formatDistance(shelter.distance)} · {shelter.type} · {shelter.open}</small>
              </span>
              <span className={shelter.status === '마감 임박' ? 'result-status warning' : 'result-status'}>{shelter.status}</span>
            </button>
          ))}
        </section>
      )}
      <p className="data-note"><CircleAlert size={14} /> 위치는 브라우저 안에서만 사용되며 서버로 전송하지 않아요.</p>
    </div>
  )
}

function ChatView({ navigate }) {
  const [started, setStarted] = useState(false)
  const [input, setInput] = useState('')
  const [replying, setReplying] = useState(false)
  const [messages, setMessages] = useState([
    { id: 1, role: 'helper', text: '안녕하세요. 이름을 말하지 않아도 괜찮아요. 지금 어떤 도움이 가장 필요한가요?' }
  ])
  const messagesEnd = useRef(null)

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const replyFor = (text) => {
    if (text.includes('위험')) return '지금 당장 다칠 위험이 있다면 112에 전화하거나, 말하기 어렵다면 문자로 현재 위치를 보내세요. 안전하게 이동할 수 있다면 가까운 대피처도 함께 찾아드릴게요.'
    if (text.includes('잘 곳') || text.includes('쉼터')) return '오늘 머물 곳이 필요하군요. 현재 위치를 공유하지 않아도 지역명만으로 찾을 수 있어요. 대피처 화면에서 가까운 쉼터를 먼저 확인해 보세요.'
    if (text.includes('돈') || text.includes('식사')) return '당장 필요한 식사 지원과 생활비 정보를 먼저 찾아볼게요. 자립 지원 메뉴에서 익명 이용 가능한 항목을 모아 볼 수 있어요.'
    return '말해줘서 고마워요. 지금 느끼는 감정과 상황 중에서 가장 힘든 부분을 천천히 적어도 괜찮아요. 이 대화는 새로고침하면 사라집니다.'
  }

  const sendMessage = async (text) => {
    const clean = text.trim()
    if (!clean || replying) return
    setStarted(true)
    setMessages((current) => [...current, { id: Date.now(), role: 'user', text: clean }])
    setInput('')
    setReplying(true)

    try {
      const response = await requestChatReply(clean)
      setMessages((current) => [...current, { id: Date.now() + 1, role: 'helper', text: response.reply }])
    } catch {
      setMessages((current) => [...current, { id: Date.now() + 1, role: 'helper', text: replyFor(clean) }])
    } finally {
      setReplying(false)
    }
  }

  return (
    <div className="view chat-view">
      <div className="chat-header">
        <div className="counselor-avatar"><Bot size={24} /></div>
        <div>
          <h1>익명 안전상담</h1>
          <span><i></i> 24시간 연결 가능</span>
        </div>
        <button className="icon-button" onClick={() => navigate('home')} aria-label="상담 닫기"><X size={21} /></button>
      </div>

      <div className="privacy-strip"><ShieldCheck size={16} /> 대화는 저장되지 않으며 언제든 빠르게 종료할 수 있어요.</div>

      <div className="messages" aria-live="polite">
        <div className="time-marker">오늘 · 익명 대화</div>
        {messages.map((message) => (
          <div className={`message ${message.role}`} key={message.id}>
            {message.role === 'helper' && <span className="mini-avatar">H</span>}
            <p>{message.text}</p>
          </div>
        ))}
        {replying && (
          <div className="message helper">
            <span className="mini-avatar">H</span>
            <p className="typing" aria-label="답변 작성 중"><i></i><i></i><i></i></p>
          </div>
        )}
        {!started && (
          <div className="quick-replies">
            {quickReplies.map((reply) => (
              <button key={reply} onClick={() => sendMessage(reply)}>{reply}<ChevronRight size={16} /></button>
            ))}
          </div>
        )}
        {started && (
          <button className="inline-shelter-button" onClick={() => navigate('shelters')}>
            <MapPin size={17} /> 가까운 대피처 함께 보기
          </button>
        )}
        <div ref={messagesEnd} />
      </div>

      <form className="chat-composer" onSubmit={(event) => { event.preventDefault(); sendMessage(input) }}>
        <label className="sr-only" htmlFor="chat-input">상담 내용 입력</label>
        <input id="chat-input" value={input} onChange={(event) => setInput(event.target.value)} placeholder="편하게 적어주세요" autoComplete="off" />
        <button type="submit" disabled={!input.trim() || replying} aria-label="보내기"><Send size={19} /></button>
      </form>
      <p className="chat-demo-note">현재는 응답 흐름 확인용 데모 상담입니다. 실제 운영 전 전문상담 연동이 필요합니다.</p>
    </div>
  )
}

function SupportView({ supports }) {
  const categories = ['전체', '주거', '생활', '일자리', '식사']
  const [category, setCategory] = useState('전체')
  const filtered = category === '전체' ? supports : supports.filter((item) => item.category === category)

  return (
    <div className="view support-view">
      <div className="page-title-row">
        <div>
          <span className="section-kicker">맞춤 자립 정보</span>
          <h1>내 삶을 준비하는 데<br />필요한 지원을 모았어요</h1>
        </div>
      </div>

      <section className="support-summary">
        <div className="summary-icon"><Compass size={28} /></div>
        <div>
          <strong>무엇부터 볼지 막막하다면</strong>
          <p>나이와 상황에 맞는 지원을 1분 안에 찾아보세요.</p>
        </div>
        <button aria-label="맞춤 지원 찾기"><ChevronRight size={20} /></button>
      </section>

      <div className="category-scroll" role="tablist" aria-label="지원 분야">
        {categories.map((item) => (
          <button
            role="tab"
            aria-selected={category === item}
            className={category === item ? 'active' : ''}
            key={item}
            onClick={() => setCategory(item)}
          >
            {item}
          </button>
        ))}
      </div>

      <section className="support-list">
        <div className="results-heading"><strong>{category} 지원</strong><span>{filtered.length}개</span></div>
        {filtered.map((item) => (
          <article className="support-card" key={item.id}>
            <div className="support-card-head">
              <span className={`category-badge category-${item.category}`}>{item.category}</span>
              <span className="deadline"><Clock3 size={14} /> {item.deadline}</span>
            </div>
            <h2>{item.title}</h2>
            <p>{item.body}</p>
            <div className="tag-row">{item.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
            <div className="support-card-foot">
              <span><UserRoundCheck size={15} /> {item.provider}</span>
              <button aria-label={`${item.title} 자세히 보기`}><ChevronRight size={19} /></button>
            </div>
          </article>
        ))}
      </section>
      <p className="data-note"><CircleAlert size={14} /> 지원 내용은 데모 정보이며 신청 전 운영기관의 최신 공고를 확인해야 합니다.</p>
    </div>
  )
}

function ShelterSheet({ shelter, onClose }) {
  const mapUrl = `https://map.kakao.com/link/to/${encodeURIComponent(shelter.name)},${shelter.lat},${shelter.lng}`

  return (
    <div className="sheet-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="bottom-sheet" role="dialog" aria-modal="true" aria-labelledby="shelter-sheet-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="sheet-handle"></div>
        <div className="sheet-title-row">
          <div>
            <span className="live-status"><i></i> {shelter.status}</span>
            <h2 id="shelter-sheet-title">{shelter.name}</h2>
            <p>{shelter.address}</p>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="닫기"><X size={20} /></button>
        </div>
        <div className="sheet-facts">
          <div><span>이용 대상</span><strong>{shelter.gender} · {shelter.ages}</strong></div>
          <div><span>운영 시간</span><strong>{shelter.open}</strong></div>
          <div><span>현재 정보</span><strong>{shelter.beds > 0 ? `${shelter.beds}자리 남음` : shelter.status}</strong></div>
        </div>
        <div className="tag-row large">{shelter.features.map((feature) => <span key={feature}>{feature}</span>)}</div>
        <p className="sheet-warning"><CircleAlert size={16} /> 출발 전 1388을 통해 입소 가능 여부를 다시 확인해 주세요.</p>
        <div className="sheet-actions">
          <a className="secondary-action" href="tel:1388"><Phone size={18} /> 전화 확인</a>
          <a className="primary-action" href={mapUrl} target="_blank" rel="noreferrer"><Navigation size={18} /> 길찾기</a>
        </div>
      </section>
    </div>
  )
}

function NoticeSheet({ onClose }) {
  return (
    <div className="sheet-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="bottom-sheet notice-sheet" role="dialog" aria-modal="true" aria-labelledby="notice-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="sheet-handle"></div>
        <div className="sheet-title-row">
          <div><span className="section-kicker">알림 설정</span><h2 id="notice-title">필요한 소식만 받을게요</h2></div>
          <button className="icon-button" onClick={onClose} aria-label="닫기"><X size={20} /></button>
        </div>
        <div className="notification-preview">
          <span className="notification-icon"><Bell size={20} /></span>
          <div><strong>대피처·지원 정보 알림</strong><p>사용자가 직접 동의하기 전에는 어떤 알림도 보내지 않습니다.</p></div>
        </div>
        <button className="primary-action full" onClick={onClose}>확인했어요</button>
      </section>
    </div>
  )
}

export default App
