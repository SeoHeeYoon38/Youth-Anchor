import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, ExternalLink, HandCoins, LockKeyhole, MapPin, Phone, Send, Siren } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { connectChatRoom, createChatRoom, createSosAlert, requestChatReply } from '../api.js'
import Mascot from '../components/Mascot.jsx'
import { quickReplies } from '../data.js'

export default function ChatPage({ position, onRoomChange, onQuickExit }) {
  const navigate = useNavigate()
  const [started, setStarted] = useState(false)
  const [input, setInput] = useState('')
  const [replying, setReplying] = useState(false)
  const [actions, setActions] = useState([])
  const [sosStatus, setSosStatus] = useState('')
  const [messages, setMessages] = useState([{ id: 1, role: 'helper', text: '안녕! 가온이야. 지금 어떤 도움이 가장 필요한지 편하게 말해줘.' }])
  const messagesEnd = useRef(null)
  const roomRef = useRef(null)
  const roomPromiseRef = useRef(null)
  const socketRef = useRef(null)

  useEffect(() => { messagesEnd.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, replying])

  useEffect(() => () => socketRef.current?.close(), [])

  const receiveReply = (response) => {
    setMessages((current) => [...current, { id: Date.now() + 1, role: 'helper', text: response.reply }])
    setActions(response.actions || [])
    setReplying(false)
  }

  const ensureRoom = async () => {
    if (roomRef.current) return roomRef.current
    if (!roomPromiseRef.current) {
      roomPromiseRef.current = createChatRoom().then(async (room) => {
        roomRef.current = room
        onRoomChange(room.id)
        try {
          socketRef.current = await connectChatRoom(room.id, {
            onReply: receiveReply,
            onError: () => setReplying(false)
          })
        } catch {
          socketRef.current = null
        }
        return room
      })
    }
    return roomPromiseRef.current
  }

  const sendMessage = async (text) => {
    const clean = text.trim()
    if (!clean || replying) return
    setStarted(true)
    setMessages((current) => [...current, { id: Date.now(), role: 'user', text: clean }])
    setActions([])
    setSosStatus('')
    setInput('')
    setReplying(true)
    try {
      const room = await ensureRoom()
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({ type: 'message', text: clean }))
        return
      }
      receiveReply(await requestChatReply(room.id, clean))
    } catch {
      setMessages((current) => [...current, { id: Date.now() + 1, role: 'helper', text: '지금 상담 서버에 연결하지 못했어요. 긴급한 상황이면 112 또는 1388로 바로 연락해 주세요.' }])
      setReplying(false)
    }
  }

  const requestPosition = () => new Promise((resolve, reject) => {
    if (position) {
      resolve(position)
      return
    }
    if (!navigator.geolocation) {
      reject(new Error('geolocation-unavailable'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ lat: coords.latitude, lng: coords.longitude }),
      reject,
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 30_000 }
    )
  })

  const sendSos = async () => {
    setSosStatus('위치를 확인하고 있어요.')
    try {
      const currentPosition = await requestPosition()
      const room = await ensureRoom()
      await createSosAlert({ position: currentPosition, roomId: room.id, message: '채팅 화면에서 긴급 도움 요청' })
      setSosStatus('긴급 알림이 접수됐어요. 즉시 위험하면 112에도 연락해 주세요.')
    } catch {
      setSosStatus('긴급 알림을 보내지 못했어요. 112에 바로 연락해 주세요.')
    }
  }

  return (
    <div className="view chat-view page-enter">
      <header className="chat-header">
        <button className="round-button transition hover:-translate-x-0.5" onClick={() => navigate('/home')} aria-label="홈으로 돌아가기"><ChevronLeft size={24} /></button>
        <Mascot pose="chat" className="mascot-breathe" alt="태블릿으로 상담하는 가온" />
        <div><h1>상담사 가온</h1><span><i /> 온라인</span></div>
        <button className="exit-compact transition active:scale-95" onClick={onQuickExit} aria-label="긴급 종료"><ExternalLink size={18} /></button>
      </header>
      <div className="privacy-strip"><LockKeyhole size={17} /> 대화는 익명으로 임시 저장되며 긴급 종료 시 즉시 삭제돼요.</div>
      <div className="messages" aria-live="polite">
        <div className="time-marker">오늘 · 익명 대화</div>
        {messages.map((message) => (
          <div className={`message ${message.role}`} key={message.id}>
            {message.role === 'helper' && <Mascot pose="chat" />}
            <p>{message.text}</p>
          </div>
        ))}
        {replying && <div className="message helper"><Mascot pose="chat" /><p className="typing" aria-label="답변 작성 중"><i /><i /><i /></p></div>}
        {!started && <div className="quick-replies stagger-grid">{quickReplies.map((reply) => <button className="group transition hover:-translate-y-0.5" key={reply} onClick={() => sendMessage(reply)}>{reply}<ChevronRight className="transition group-hover:translate-x-1" size={17} /></button>)}</div>}
        {actions.length > 0 && (
          <div className="chat-actions page-enter">
            {actions.includes('find-shelter') && <button onClick={() => navigate('/shelters')}><MapPin size={17} /> 가까운 대피처 보기</button>}
            {actions.includes('view-support') && <button onClick={() => navigate('/support')}><HandCoins size={17} /> 지원 사업 확인하기</button>}
            {actions.includes('send-sos') && <button className="danger" onClick={sendSos}><Siren size={17} /> 긴급 알림 보내기</button>}
            {actions.includes('call-112') && <a className="danger" href="tel:112"><Phone size={17} /> 112 전화하기</a>}
            {actions.includes('call-1388') && <a href="tel:1388"><Phone size={17} /> 1388 전화하기</a>}
          </div>
        )}
        {sosStatus && <p className="sos-status" role="status">{sosStatus}</p>}
        <div ref={messagesEnd} />
      </div>
      <form className="chat-composer" onSubmit={(event) => { event.preventDefault(); sendMessage(input) }}>
        <label className="sr-only" htmlFor="chat-input">상담 내용 입력</label>
        <input id="chat-input" value={input} onChange={(event) => setInput(event.target.value)} placeholder="가온에게 편하게 말해줘" autoComplete="off" />
        <button className="transition active:scale-90" type="submit" disabled={!input.trim() || replying} aria-label="보내기"><Send size={20} /></button>
      </form>
      <p className="chat-demo-note">익명 상담 세션은 24시간 후 자동 만료돼요.</p>
    </div>
  )
}
