import { Bell, ExternalLink, Home, Map, MessageCircle, WalletCards } from 'lucide-react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import ChatFab from '../components/ChatFab.jsx'
import Mascot from '../components/Mascot.jsx'

const NAV_ITEMS = [
  { to: '/home', label: '홈', icon: Home },
  { to: '/shelters', label: '지도', icon: Map },
  { to: '/chat', label: '채팅', icon: MessageCircle },
  { to: '/support', label: '지원', icon: WalletCards }
]

export default function HavenLayout({ onQuickExit, onNotice }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const hasOwnHeader = pathname === '/chat' || pathname === '/shelters'

  return (
    <div className={`app-shell route-${pathname.slice(1) || 'home'}`}>
      {!hasOwnHeader && (
        <header className="topbar">
          <button className="brand group" onClick={() => navigate('/home')} aria-label="Haven 홈">
            <Mascot pose="basic" className="transition duration-300 group-hover:scale-110" />
            <span>HAVEN</span>
          </button>
          <div className="topbar-actions">
            <button className="icon-button transition hover:-translate-y-0.5" onClick={onNotice} aria-label="알림 안내"><Bell size={20} /></button>
            <button className="exit-button transition active:scale-95" onClick={onQuickExit}><ExternalLink size={17} /> 긴급 종료</button>
          </div>
        </header>
      )}

      <main><Outlet /></main>

      {pathname !== '/chat' && <ChatFab />}

      <nav className="bottom-nav" aria-label="주요 메뉴">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            {({ isActive }) => <><Icon size={22} strokeWidth={isActive ? 2.7 : 2} /><span>{label}</span></>}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
