import { ChevronRight, CircleAlert, LocateFixed, MessageCircle, Phone, ShieldCheck, X } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DesignIcon from '../components/DesignIcon.jsx'
import Mascot from '../components/Mascot.jsx'
import ShelterCard from '../components/ShelterCard.jsx'

export default function HomePage({ shelters, locationMessage, locateMe, locating, onSelectShelter, onOpenGuide }) {
  const navigate = useNavigate()
  const [chatFabVisible, setChatFabVisible] = useState(true)

  return (
    <div className="view home-view page-enter">
      <section className="guest-card reveal-card">
        <Mascot pose="basic" alt="태블릿을 든 가온" />
        <div>
          <span className="guest-label"><ShieldCheck size={15} /> 익명 게스트 모드</span>
          <h1>안녕하세요, 게스트님!</h1>
          <p>가온과 함께 필요한 도움을 안전하게 찾아봐요.</p>
        </div>
      </section>

      <section className="feature-section" aria-labelledby="feature-title">
        <div className="section-title-row">
          <div><span>바로 도움받기</span><h2 id="feature-title">무엇을 도와드릴까요?</h2></div>
          <small>개인정보 없이 이용해요</small>
        </div>
        <div className="feature-grid stagger-grid">
          <button className="feature-tile tile-coral group transition duration-300 hover:-translate-y-1 active:scale-[0.98]" onClick={() => navigate('/shelters')}>
            <DesignIcon variant="map" />
            <strong>SOS 대피처</strong>
            <small>가까운 안전 공간 찾기</small>
            <ChevronRight className="transition group-hover:translate-x-1" size={20} />
          </button>
          <button className="feature-tile tile-blue group transition duration-300 hover:-translate-y-1 active:scale-[0.98]" onClick={() => navigate('/chat')}>
            <DesignIcon variant="robot" />
            <strong>익명 톡 상담</strong>
            <small>가온에게 조용히 말하기</small>
            <ChevronRight className="transition group-hover:translate-x-1" size={20} />
          </button>
          <button className="feature-tile tile-yellow group transition duration-300 hover:-translate-y-1 active:scale-[0.98]" onClick={() => navigate('/support')}>
            <DesignIcon variant="support" />
            <strong>지원 프로그램</strong>
            <small>주거·생활 지원 모아보기</small>
            <ChevronRight className="transition group-hover:translate-x-1" size={20} />
          </button>
          <button className="feature-tile tile-purple group transition duration-300 hover:-translate-y-1 active:scale-[0.98]" onClick={onOpenGuide}>
            <DesignIcon variant="guide" />
            <strong>안전 가이드</strong>
            <small>흔적 없이 안전하게</small>
            <ChevronRight className="transition group-hover:translate-x-1" size={20} />
          </button>
        </div>
      </section>

      <a href="tel:1388" className="help-line group transition duration-300 hover:-translate-y-1">
        <span className="help-line-icon"><Phone size={20} /></span>
        <span><small>24시간 무료 청소년 상담</small><strong>1388에 바로 연결</strong></span>
        <ChevronRight className="transition group-hover:translate-x-1" size={20} />
      </a>

      <section className="nearby-section">
        <div className="section-title-row nearby-title">
          <div><span>가까운 안전 공간</span><h2>지금 갈 수 있는 대피처</h2><p>{locationMessage}</p></div>
          <button className="locate-button transition hover:-translate-y-0.5" onClick={locateMe} disabled={locating}>
            <LocateFixed size={18} className={locating ? 'spin' : ''} /> {locating ? '찾는 중' : '내 위치'}
          </button>
        </div>
        <div className="shelter-strip">
          {shelters.slice(0, 3).map((shelter) => (
            <ShelterCard key={shelter.id} shelter={shelter} onClick={() => onSelectShelter(shelter)} />
          ))}
        </div>
        <button className="section-link group" onClick={() => navigate('/shelters')}>지도에서 모두 보기 <ChevronRight className="transition group-hover:translate-x-1" size={18} /></button>
      </section>

      <p className="data-note"><CircleAlert size={14} /> 대피처 잔여석은 현재 기능 확인용 예시 정보입니다.</p>
      {chatFabVisible && (
        <div className="home-chat-fab">
          <button className="home-chat-fab-open" onClick={() => navigate('/chat')} aria-label="가온과 익명 상담 시작"><MessageCircle size={22} /><span>가온에게 말하기</span></button>
          <button className="home-chat-fab-close" onClick={() => setChatFabVisible(false)} aria-label="채팅 플로팅 버튼 닫기"><X size={13} /></button>
        </div>
      )}
    </div>
  )
}
