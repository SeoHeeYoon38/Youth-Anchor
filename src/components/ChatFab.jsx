import { useState } from 'react'
import { X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function ChatFab() {
  const navigate = useNavigate()
  const [visible, setVisible] = useState(true)

  if (!visible) return null

  return (
    <div className="chat-fab">
      <button
        className="chat-fab-open"
        type="button"
        onClick={() => navigate('/legal')}
        aria-label="가온 법률 상담 열기"
      >
        <img src="/figma/warm/welcome-mascot.png" alt="" aria-hidden="true" />
      </button>
      <span className="chat-fab-bubble">법률 상담을 받을 수 있어요</span>
      <button
        className="chat-fab-close"
        type="button"
        onClick={() => setVisible(false)}
        aria-label="가온 법률 상담 플로팅 버튼 닫기"
      >
        <X size={10} />
      </button>
    </div>
  )
}
