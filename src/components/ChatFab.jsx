import { useState } from 'react'
import { X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Mascot from './Mascot.jsx'

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
