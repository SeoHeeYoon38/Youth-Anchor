import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, ExternalLink, LockKeyhole, MapPin, Send } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { requestChatReply } from '../api.js'
import { MASCOTS } from '../constants.js'
import { quickReplies } from '../data.js'

export default function ChatPage({ onQuickExit }) {
  const navigate = useNavigate()
  const [started, setStarted] = useState(false)
  const [input, setInput] = useState('')
  const [replying, setReplying] = useState(false)
  const [messages, setMessages] = useState([{ id: 1, role: 'helper', text: '안녕! 가온이야. 지금 어떤 도움이 가장 필요한지 편하게 말해줘.' }])
  const messagesEnd = useRef(null)

  useEffect(() => { messagesEnd.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, replying])

  const fallbackReply = (text) => {
    if (text.includes('위험')) return '지금 당장 다칠 위험이 있다면 112에 전화해 줘. 안전하게 움직일 수 있다면 가장 가까운 대피처도 바로 찾아줄게.'
    if (text.includes('잘 곳') || text.includes('쉼터')) return '오늘 머물 곳이 필요하구나. 대피처 화면에서 가까운 곳을 찾고, 출발 전 1388로 입소 가능 여부를 확인해 보자.'
    if (text.includes('돈') || text.includes('식사')) return '식사와 생활비 지원부터 같이 확인해 보자. 지원 메뉴에 필요한 정보를 모아뒀어.'
    return '말해줘서 고마워. 지금 가장 힘든 부분부터 천천히 적어도 괜찮아. 이 대화는 새로고침하면 사라져.'
  }

  const sendMessage = async (text) => {
    const clean = text.trim()
    if (!clean || replying) return
    setStarted(true)
    setMessages((current) => [...current, { id: Date.now(), role: 'user', text: clean }])
    setInput('')
    setReplying(true)
    try {
      const response = await requestChatReply(clean)
      setMessages((current) => [...current, { id: Date.now() + 1, role: 'helper', text: response.reply }])
    } catch {
      setMessages((current) => [...current, { id: Date.now() + 1, role: 'helper', text: fallbackReply(clean) }])
    } finally {
      setReplying(false)
    }
  }

  return (
    <div className="view chat-view page-enter">
      <header className="chat-header">
        <button className="round-button transition hover:-translate-x-0.5" onClick={() => navigate('/home')} aria-label="홈으로 돌아가기"><ChevronLeft size={24} /></button>
        <img className="mascot-breathe" src={MASCOTS.chat} alt="태블릿으로 상담하는 가온" />
        <div><h1>상담사 가온</h1><span><i /> 온라인</span></div>
        <button className="exit-compact transition active:scale-95" onClick={onQuickExit} aria-label="긴급 종료"><ExternalLink size={18} /></button>
      </header>
      <div className="privacy-strip"><LockKeyhole size={17} /> 대화는 저장하지 않으며 새로고침하면 사라져요.</div>
      <div className="messages" aria-live="polite">
        <div className="time-marker">오늘 · 익명 대화</div>
        {messages.map((message) => (
          <div className={`message ${message.role}`} key={message.id}>
            {message.role === 'helper' && <img src={MASCOTS.chat} alt="" />}
            <p>{message.text}</p>
          </div>
        ))}
        {replying && <div className="message helper"><img src={MASCOTS.chat} alt="" /><p className="typing" aria-label="답변 작성 중"><i /><i /><i /></p></div>}
        {!started && <div className="quick-replies stagger-grid">{quickReplies.map((reply) => <button className="group transition hover:-translate-y-0.5" key={reply} onClick={() => sendMessage(reply)}>{reply}<ChevronRight className="transition group-hover:translate-x-1" size={17} /></button>)}</div>}
        {started && <button className="inline-shelter-button page-enter" onClick={() => navigate('/shelters')}><MapPin size={17} /> 가까운 대피처 함께 보기</button>}
        <div ref={messagesEnd} />
      </div>
      <form className="chat-composer" onSubmit={(event) => { event.preventDefault(); sendMessage(input) }}>
        <label className="sr-only" htmlFor="chat-input">상담 내용 입력</label>
        <input id="chat-input" value={input} onChange={(event) => setInput(event.target.value)} placeholder="가온에게 편하게 말해줘" autoComplete="off" />
        <button className="transition active:scale-90" type="submit" disabled={!input.trim() || replying} aria-label="보내기"><Send size={20} /></button>
      </form>
      <p className="chat-demo-note">현재는 흐름 확인용 AI 응답이며 실제 운영 전 전문상담 연동이 필요합니다.</p>
    </div>
  )
}
