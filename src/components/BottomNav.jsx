import { BookOpen, Home, LifeBuoy, Map, MessageCircle } from 'lucide-react'
import { NavLink } from 'react-router-dom'

const NAV_ITEMS = [
  { to: '/home', label: '홈', icon: Home, warmIcon: '/figma/warm/nav-home.svg', mapIcon: '/figma/warm/map-nav-home.svg' },
  { to: '/shelters', label: '지도', icon: Map, warmIcon: '/figma/warm/nav-map.svg', mapIcon: '/figma/warm/map-nav-map.svg' },
  { to: '/chat', label: '채팅', icon: MessageCircle, warmIcon: '/figma/warm/nav-chat.svg', mapIcon: '/figma/warm/map-nav-chat.svg', activeIcon: '/icons/help/chat-bubble.svg' },
  { to: '/rights', label: '서류사전', icon: BookOpen }
]

const SUPPORT_NAV_ITEMS = [
  ...NAV_ITEMS.slice(0, 3),
  { to: '/support', label: '지원', icon: LifeBuoy, warmIcon: '/figma/warm/nav-support.svg', mapIcon: '/figma/warm/map-nav-support.svg' }
]

export default function BottomNav({ warm = false, mapTheme = false, supportLast = false }) {
  const items = supportLast ? SUPPORT_NAV_ITEMS : NAV_ITEMS

  return (
    <nav className={`bottom-nav ${warm ? 'warm-bottom-nav' : ''}`} aria-label="주요 메뉴">
      {items.map(({ to, label, icon: Icon, warmIcon, mapIcon, activeIcon }) => (
        <NavLink key={to} to={to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          {({ isActive }) => {
            const artwork = isActive && activeIcon
            const src = artwork || (warm && (mapTheme ? mapIcon : warmIcon))
            return <>
              <span className="home-nav-icon" aria-hidden="true">
                {src ? <img className={artwork ? 'nav-artwork' : undefined} src={src} alt="" /> : <Icon size={22} strokeWidth={isActive ? 2.7 : 2} />}
              </span>
              <span>{label}</span>
            </>
          }}
        </NavLink>
      ))}
    </nav>
  )
}
