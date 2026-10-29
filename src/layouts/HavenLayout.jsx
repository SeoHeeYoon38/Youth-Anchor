import { Bell, ExternalLink, Home, Map, MessageCircle, WalletCards } from 'lucide-react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import ChatFab from '../components/ChatFab.jsx'
import Mascot from '../components/Mascot.jsx'

const NAV_ITEMS = [
  { to: '/home', label: '홈', icon: Home, warmIcon: '/figma/warm/nav-home.svg', mapIcon: '/figma/warm/map-nav-home.svg' },
  { to: '/shelters', label: '지도', icon: Map, warmIcon: '/figma/warm/nav-map.svg', mapIcon: '/figma/warm/map-nav-map.svg' },
  { to: '/chat', label: '채팅', icon: MessageCircle, warmIcon: '/figma/warm/nav-chat.svg', mapIcon: '/figma/warm/map-nav-chat.svg' },
  { to: '/support', label: '지원', icon: WalletCards, warmIcon: '/figma/warm/nav-support.svg', mapIcon: '/figma/warm/map-nav-support.svg' }
]

export default function HavenLayout({ onQuickExit, onNotice }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const hasOwnHeader = pathname === '/chat' || pathname === '/shelters'
  const isHome = pathname === '/home'
  const isShelters = pathname === '/shelters'
  const isChat = pathname === '/chat'
  const isSupport = pathname === '/support'
  const usesWarmHeader = isHome || isSupport
  const usesWarmNav = isHome || isShelters || isChat || isSupport

  return (
    <div className={`app-shell route-${pathname.slice(1) || 'home'}`}>
      {!hasOwnHeader && (
        <header className="topbar">
          <button className="brand group" onClick={() => navigate('/home')} aria-label="Haven 홈">
            {usesWarmHeader ? (
              <span className="home-brand-mark" aria-hidden="true"><img src="/figma/warm/haven-house-only.png" alt="" /></span>
            ) : (
              <Mascot pose="basic" className="transition duration-300 group-hover:scale-110" />
            )}
            <span>HAVEN</span>
          </button>
          <div className="topbar-actions">
            <button className="icon-button transition hover:-translate-y-0.5" onClick={onNotice} aria-label="알림 안내">
              {usesWarmHeader ? <img src="/figma/warm/home-bell.svg" alt="" aria-hidden="true" /> : <Bell size={20} />}
            </button>
            <button className="exit-button transition active:scale-95" onClick={onQuickExit}>
              {usesWarmHeader ? <img src="/figma/warm/home-power.svg" alt="" aria-hidden="true" /> : <ExternalLink size={17} />}
              긴급 종료
            </button>
          </div>
        </header>
      )}

      <main><Outlet /></main>

      {pathname !== '/chat' && <ChatFab key={pathname} />}

      <nav className="bottom-nav" aria-label="주요 메뉴">
        {NAV_ITEMS.map(({ to, label, icon: Icon, warmIcon, mapIcon }) => (
          <NavLink key={to} to={to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            {({ isActive }) => <>{usesWarmNav ? <span className="home-nav-icon" aria-hidden="true"><img src={isShelters ? mapIcon : warmIcon} alt="" /></span> : <Icon size={22} strokeWidth={isActive ? 2.7 : 2} />}<span>{label}</span></>}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
