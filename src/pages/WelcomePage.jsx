import { ChevronRight, ExternalLink } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { MASCOTS } from '../constants.js'

export default function WelcomePage({ onQuickExit }) {
  const navigate = useNavigate()

  const startHaven = () => {
    sessionStorage.setItem('haven-welcomed', 'yes')
    navigate('/home')
  }

  return (
    <div className="welcome-screen page-enter">
      <div className="welcome-grid" aria-hidden="true" />
      <div className="welcome-topline">
        <span>HAVEN</span>
        <button className="transition hover:-translate-y-0.5 active:scale-95" onClick={onQuickExit}><ExternalLink size={16} /> 긴급 종료</button>
      </div>
      <div className="welcome-copy reveal-stack">
        <span className="welcome-label">설치 없이 바로 만나는 안전한 공간</span>
        <h1>어서 와!<br />너의 든든한 친구<br /><em>‘가온’</em>이야.</h1>
        <p>위기청소년과 자립준비청년을 위한<br />흔적 없는 통합 지원 서비스예요.</p>
      </div>
      <div className="welcome-mascot">
        <span className="mascot-halo" aria-hidden="true" />
        <img src={MASCOTS.welcome} alt="두 팔을 벌려 반기는 Haven 안내 캐릭터 가온" />
        <span>언제든 네 편이 되어줄게</span>
      </div>
      <button className="welcome-start group transition duration-300 hover:-translate-y-1 active:scale-[0.98]" onClick={startHaven}>
        Haven 시작하기 <ChevronRight className="transition group-hover:translate-x-1" size={20} />
      </button>
      <small>회원가입 없이 바로 이용할 수 있어요</small>
    </div>
  )
}
