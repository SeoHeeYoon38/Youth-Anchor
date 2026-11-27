import { LocateFixed, LockKeyhole } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import ShelterCard from '../components/ShelterCard.jsx'
import { FamilyHelpCard, ShelterVisitNote } from '../components/ShelterHelp.jsx'

const WARM_ASSET_ROOT = '/figma/warm'

const QUICK_ACTIONS = [
  { label: '지원', description: '주거·생활 지원 찾아보기', icon: '/icons/help/support.svg', tone: 'rights', to: '/support' },
  { label: '법률 상담', description: '부당한 일, 같이 대응하기', icon: '/icons/help/scales.svg', tone: 'legal', to: '/legal' },
  { label: '일기장', description: '오늘의 기분을 남겨보기', icon: '/icons/help/diary.svg', tone: 'diary', to: '/diary' },
  { label: '안전 가이드', description: '흔적 없이 안전하게', icon: '/icons/help/safety-lock.svg', tone: 'guide', action: 'guide' }
]

export default function HomePage({ shelters, locationMessage, locateMe, locating, onSelectShelter, onOpenGuide }) {
  const navigate = useNavigate()

  return (
    <div className="view home-view">
      <section className="home-hero-card">
        <div className="home-hero-copy">
          <span>오늘도 안전한 하루</span>
          <h1>반가워요, 방문자님!</h1>
          <p>HAVEN과 함께 필요한 도움을 찾아봐요.</p>
        </div>
        <a href="tel:1388" className="home-help-line group transition duration-300 hover:-translate-y-1">
          <img className="youth-call-icon" src="/icons/help/phone-heart.svg" alt="" />
          <span className="home-help-copy"><strong>1388에 바로 연결</strong><small>24시간 무료 청소년 상담</small></span>
          <img className="home-chevron" src={`${WARM_ASSET_ROOT}/chevron-right.svg`} alt="" aria-hidden="true" />
        </a>
      </section>

      <section className="feature-section" aria-labelledby="feature-title">
        <div className="home-section-heading">
          <div><span>바로 도움받기</span><h2 id="feature-title">무엇을 도와드릴까요?</h2></div>
          <small><LockKeyhole size={13} aria-hidden="true" />개인정보 없이 이용가능</small>
        </div>
        <div className="feature-grid">
          {QUICK_ACTIONS.map((item) => (
            <button
              key={item.label}
              className={`feature-tile feature-tile-${item.tone} group transition duration-300 hover:-translate-y-1 active:scale-[0.98]`}
              onClick={() => item.action === 'guide' ? onOpenGuide() : navigate(item.to)}
            >
              <img className="feature-icon" src={item.icon} alt="" />
              <strong>{item.label}</strong>
              <small>{item.description}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="nearby-section">
        <div className="home-section-heading nearby-title">
          <div><span>안전하게 머물 곳</span><h2>가까운 청소년쉼터</h2><p>{locationMessage}</p></div>
          <button className="locate-button transition hover:-translate-y-0.5" onClick={locateMe} disabled={locating}>
            <LocateFixed size={18} className={locating ? 'spin' : ''} /> {locating ? '찾는 중' : '내 위치'}
          </button>
        </div>
        <FamilyHelpCard />
        <div className="shelter-strip">
          {shelters.map((shelter) => (
            <ShelterCard key={shelter.id} shelter={shelter} variant="warm" onClick={() => onSelectShelter(shelter)} />
          ))}
          {shelters.length === 0 && <div className="empty-state compact"><strong>표시할 쉼터가 없어요</strong><p>잠시 후 다시 확인해 주세요.</p></div>}
        </div>
        <button className="section-link group" onClick={() => navigate('/shelters')}>지도에서 모두 보기 <span aria-hidden="true">&gt;</span></button>
        <ShelterVisitNote />
      </section>
    </div>
  )
}
