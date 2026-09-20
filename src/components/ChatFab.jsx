import { useState } from 'react'
import { X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Mascot from './Mascot.jsx'

export default function ChatFab() {
  const navigate = useNavigate()
  const [visible, setVisible] = useState(true)

  if (!visible) return null

  return (
    // 바로 이 줄! style 속성을 추가해 0.7배로 줄이고 우측 하단에 고정합니다.
    <div className="chat-fab" style={{ transform: 'scale(0.7)', transformOrigin: 'bottom right' }}>
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