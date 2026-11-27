import { BookOpen, Home, LifeBuoy, Map, MessageCircle } from 'lucide-react'
import { NavLink } from 'react-router-dom'

const NAV_ITEMS = [
  { to: '/home', label: '홈', icon: Home, warmIcon: '/figma/warm/nav-home.svg', mapIcon: '/figma/warm/map-nav-home.svg', activeIcon: '/icons/nav/home.svg' },
  { to: '/shelters', label: '지도', icon: Map, warmIcon: '/figma/warm/nav-map.svg', mapIcon: '/figma/warm/map-nav-map.svg', activeIcon: '/icons/nav/map.svg' },
  { to: '/chat', label: '채팅', icon: MessageCircle, warmIcon: '/figma/warm/nav-chat.svg', mapIcon: '/figma/warm/map-nav-chat.svg', activeIcon: '/icons/help/chat-bubble.svg' },
  { to: '/rights', label: '서류사전', icon: BookOpen, activeIcon: '/icons/nav/book.svg' }
]

const SUPPORT_NAV_ITEMS = [
  ...NAV_ITEMS.slice(0, 3),
  { to: '/support', label: '지원', icon: LifeBuoy, warmIcon: '/figma/warm/nav-support.svg', mapIcon: '/figma/warm/map-nav-support.svg', activeIcon: '/icons/nav/support.svg' }
]

export default function BottomNav({ warm = false, mapTheme = false, supportLast = false }) {
  const items = supportLast ? SUPPORT_NAV_ITEMS : NAV_ITEMS

  return (
    <nav className={`bottom-nav ${warm ? 'warm-bottom-nav' : ''}`} aria-label="주요 메뉴">
      {items.map(({ to, label, icon: Icon, warmIcon, mapIcon, activeIcon }) => (
        <NavLink key={to} to={to} state={to === '/support' ? { supportNav: true } : undefined} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          {({ isActive }) => {
            const src = isActive ? activeIcon : warm && (mapTheme ? mapIcon : warmIcon)
            return <>
              <span className="home-nav-icon" aria-hidden="true">{src ? <img src={src} alt="" /> : <Icon size={22} />}</span>
              <span>{label}</span>
            </>
          }}
        </NavLink>
      ))}
    </nav>
  )
}
