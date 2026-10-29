import { LocateFixed } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import ShelterCard from '../components/ShelterCard.jsx'

const WARM_ASSET_ROOT = '/figma/warm'

const QUICK_ACTIONS = [
  { label: 'SOS 대피처', description: '가까운 안전한 장소를 찾아보세요', icon: 'action-shelter.svg', tone: 'shelter', to: '/shelters' },
  { label: '익명 톡 상담', description: '조용히 대화하기', icon: 'action-chat.svg', tone: 'chat', to: '/chat' },
  { label: '지원 프로그램', description: '주거 생활 지원 모아보기', icon: 'action-support.svg', tone: 'support', to: '/support' },
  { label: '안전 가이드', description: '흔적 없이 안전하게', icon: 'action-guide.svg', tone: 'guide', action: 'guide' }
]

export default function HomePage({ shelters, locationMessage, locateMe, locating, onSelectShelter, onOpenGuide }) {
  const navigate = useNavigate()

  return (
    <div className="view home-view page-enter">
      <section className="home-hero-card reveal-card">
        <div className="home-hero-copy">
          <span>오늘도 안전한 하루</span>
          <h1>반가워요, 게스트님!</h1>
          <p>HAVEN과 함께 필요한 도움을 찾아봐요.</p>
        </div>
        <a href="tel:1388" className="home-help-line group transition duration-300 hover:-translate-y-1">
          <span className="home-help-icon" aria-hidden="true"><img src={`${WARM_ASSET_ROOT}/heart.svg`} alt="" /></span>
          <span className="home-help-copy"><strong>1388에 바로 연결</strong><small>24시간 무료 청소년 상담</small></span>
          <img className="home-chevron" src={`${WARM_ASSET_ROOT}/chevron-right.svg`} alt="" aria-hidden="true" />
        </a>
      </section>

      <section className="feature-section" aria-labelledby="feature-title">
        <div className="home-section-heading">
          <div><span>바로 도움받기</span><h2 id="feature-title">무엇을 도와드릴까요?</h2></div>
          <small>개인정보 없이 이용가능</small>
        </div>
        <div className="feature-grid stagger-grid">
          {QUICK_ACTIONS.map((item) => (
            <button
              key={item.label}
              className={`feature-tile feature-tile-${item.tone} group transition duration-300 hover:-translate-y-1 active:scale-[0.98]`}
              onClick={() => item.action === 'guide' ? onOpenGuide() : navigate(item.to)}
            >
              <span className="feature-icon" aria-hidden="true"><img src={`${WARM_ASSET_ROOT}/${item.icon}`} alt="" /></span>
              <strong>{item.label}</strong>
              <small>{item.description}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="nearby-section">
        <div className="home-section-heading nearby-title">
          <div><span>가까운 안전 공간</span><h2>지금 갈 수 있는 대피처</h2><p>{locationMessage}</p></div>
          <button className="locate-button transition hover:-translate-y-0.5" onClick={locateMe} disabled={locating}>
            <LocateFixed size={18} className={locating ? 'spin' : ''} /> {locating ? '찾는 중' : '내 위치'}
          </button>
        </div>
        <button className="shelter-intro-card" onClick={() => navigate('/shelters')}>
          <span className="shelter-intro-icon" aria-hidden="true"><img src={`${WARM_ASSET_ROOT}/shelter-intro.svg`} alt="" /></span>
          <span><strong>가까운 대피처를 찾아보세요</strong><small>방문 전 운영 여부와 이용 가능 인원을 확인한 뒤 갈 수 있는 대피처를 찾아보세요.</small></span>
        </button>
        <div className="shelter-strip">
          {shelters.slice(0, 3).map((shelter) => (
            <ShelterCard key={shelter.id} shelter={shelter} variant="warm" onClick={() => onSelectShelter(shelter)} />
          ))}
          {shelters.length === 0 && <div className="empty-state compact"><strong>등록된 대피처가 없어요</strong><p>관리자가 정보를 등록하면 가까운 순서로 표시돼요.</p></div>}
        </div>
        <button className="section-link group" onClick={() => navigate('/shelters')}>지도에서 모두 보기 <span aria-hidden="true">&gt;</span></button>
      </section>
    </div>
  )
}
