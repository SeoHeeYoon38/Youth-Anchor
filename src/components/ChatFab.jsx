import { useState } from 'react'
import { X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Mascot from './Mascot.jsx'

/**
 * 가온 헬퍼 플로팅 버튼.
 *
 * 홈·대피처·지원 화면이 같은 위치와 같은 아이콘을 쓰도록 한 곳에서 관리한다.
 * 화면마다 따로 만들면 위치와 모양이 어긋나므로 컴포넌트로 공유한다.
 */
export default function ChatFab() {
  const navigate = useNavigate()
  const [visible, setVisible] = useState(true)

  if (!visible) return null

  return (
    <div className="chat-fab">
      <button
        className="chat-fab-open"
        type="button"
        onClick={() => navigate('/chat')}
        aria-label="가온 헬퍼 채팅 열기"
      >
        <Mascot pose="guide" />
      </button>
      <button
        className="chat-fab-close"
        type="button"
        onClick={() => setVisible(false)}
        aria-label="가온 헬퍼 플로팅 버튼 닫기"
      >
        <X size={13} />
      </button>
    </div>
  )
}
