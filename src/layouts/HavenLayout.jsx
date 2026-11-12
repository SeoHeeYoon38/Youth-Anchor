import { Bell, ExternalLink } from 'lucide-react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import BottomNav from '../components/BottomNav.jsx'
import ChatFab from '../components/ChatFab.jsx'
import Mascot from '../components/Mascot.jsx'

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

      <BottomNav warm={usesWarmNav} mapTheme={isShelters} />
    </div>
  )
}
