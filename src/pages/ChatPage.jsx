import { useEffect, useRef, useState } from 'react'
import { ChevronRight, LockKeyhole, Navigation, Power } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import DragBackHeader from '../components/DragBackHeader.jsx'
import { connectChatRoom, createChatRoom, requestChatReply } from '../api.js'
import { quickReplies } from '../data.js'

const CHAT_MASCOT_SRC = '/figma/warm/chat-bear-face-cutout.png'
const INITIAL_MESSAGE = { id: 1, role: 'helper', text: '안녕! 가온이야. 지금 어떤 도움이 가장 필요한지 편하게 말해줘.' }
const CHAT_EMOTES = {
  sleep: { src: '/figma/warm/chat-emote-sleep.png', alt: '편안히 잠든 가온' },
  cry: { src: '/figma/warm/chat-emote-cry.png', alt: '눈물을 흘리는 가온' },
  support: { src: '/figma/warm/chat-emote-support.png', alt: '걱정하며 돕고 싶은 가온' }
}
const QUICK_REPLY_ACTIONS = {
  '오늘 잘 곳이 없어요': ['find-shelter', 'call-1388'],
  '지금 위험해요': ['call-112'],
  '돈과 식사가 필요해요': ['view-support']
}

function detectLocalActions(text) {
  const actions = new Set()
  if (/(위험|폭력|맞았|죽고|자해|살려|납치|협박|쫓아|무서|두려)/.test(text)) {
    actions.add('call-112')
  }
  if (/(잘\s*곳|잘곳|잠.{0,4}곳|쉼터|가출|집에.{0,5}못|머물|노숙|숙소)/.test(text)) {
    actions.add('find-shelter')
    actions.add('call-1388')
  }
  if (/(돈|생활비|식사|밥|먹을|먹을게|배고|굶|지원금|지원\s*사업|일자리|주거비|생계)/.test(text)) actions.add('view-support')
  if (/(상담|이야기|외로|힘들|불안|우울|괴로|답답)/.test(text)) actions.add('call-1388')
  return [...actions]
}

const createMessageId = (type) => `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

function findChatEmote(text) {
  const normalized = text.trim()

  if (normalized === '그냥 이야기하고 싶어요') return null
  if (normalized === '오늘 잘 곳이 없어요' || /(잘\s*곳|잠잘|오늘.*잘|노숙|쉼터|숙소)/.test(normalized)) return 'sleep'
  if (normalized === '지금 위험해요' || /(위험|무서|두려|폭력|따라와|쫓아|긴급|살려)/.test(normalized)) return 'cry'
  if (normalized === '돈과 식사가 필요해요' || /(돈|식사|밥|먹을|배고|생활비|생계|굶)/.test(normalized)) return 'support'

  return null
}

function ChatMascot({ className = '', alt = '' }) {
  return (
    <span className={`chat-bear-mascot ${className}`.trim()} role={alt ? 'img' : undefined} aria-label={alt || undefined} aria-hidden={alt ? undefined : true}>
      <img src={CHAT_MASCOT_SRC} alt="" />
    </span>
  )
}

export default function ChatPage({ onRoomChange, onQuickExit }) {
  const navigate = useNavigate()
  const [input, setInput] = useState('')
  const [replying, setReplying] = useState(false)
  const [showQuickReplies, setShowQuickReplies] = useState(true)
  const [actions, setActions] = useState([])
  const [freeConversationMode, setFreeConversationMode] = useState(false)
  const [messages, setMessages] = useState([INITIAL_MESSAGE])
  const messagesEnd = useRef(null)
  const roomRef = useRef(null)
  const roomPromiseRef = useRef(null)
  const socketRef = useRef(null)
  const reopenQuickRepliesRef = useRef(false)
  const pendingQuickReplyRef = useRef(null)
  const pendingActionsRef = useRef([])
  const freeConversationModeRef = useRef(false)

  useEffect(() => { messagesEnd.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, replying])

  useEffect(() => {
    try {
      sessionStorage.removeItem('haven.chat-state')
    } catch {
      // The chat still resets normally when temporary browser storage is unavailable.
    }
    return () => socketRef.current?.close()
  }, [])

  const receiveReply = (response) => {
    const showAvatar = freeConversationModeRef.current
    setMessages((current) => [...current, { id: createMessageId('helper'), role: 'helper', text: response.reply, showAvatar }])
    setActions([...new Set([...(response.actions || []), ...pendingActionsRef.current])])
    setShowQuickReplies(reopenQuickRepliesRef.current)
    reopenQuickRepliesRef.current = false
    pendingQuickReplyRef.current = null
    pendingActionsRef.current = []
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
            onError: () => {
              setActions(pendingActionsRef.current)
              setShowQuickReplies(reopenQuickRepliesRef.current)
              reopenQuickRepliesRef.current = false
              pendingQuickReplyRef.current = null
              pendingActionsRef.current = []
              setReplying(false)
            }
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
    const emote = findChatEmote(clean)
    const isQuickReply = quickReplies.includes(clean)
    const shouldReopenQuickReplies = isQuickReply && clean !== '그냥 이야기하고 싶어요'
    if (clean === '그냥 이야기하고 싶어요' || !isQuickReply) {
      freeConversationModeRef.current = true
      setFreeConversationMode(true)
    }
    reopenQuickRepliesRef.current = shouldReopenQuickReplies
    pendingQuickReplyRef.current = isQuickReply ? clean : null
    pendingActionsRef.current = [...new Set([
      ...(QUICK_REPLY_ACTIONS[clean] || []),
      ...detectLocalActions(clean)
    ])]
    setShowQuickReplies(false)
    setMessages((current) => [
      ...current,
      { id: createMessageId('user'), role: 'user', text: clean },
      ...(emote ? [{ id: createMessageId('emote'), role: 'emote', emote }] : [])
    ])
    setActions([])
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
      const showAvatar = freeConversationModeRef.current
      setMessages((current) => [...current, { id: createMessageId('helper'), role: 'helper', text: '지금 상담 서버에 연결하지 못했어요. 긴급한 상황이면 112 또는 1388로 바로 연락해 주세요.', showAvatar }])
      setActions(pendingActionsRef.current)
      setShowQuickReplies(reopenQuickRepliesRef.current)
      reopenQuickRepliesRef.current = false
      pendingQuickReplyRef.current = null
      pendingActionsRef.current = []
      setReplying(false)
    }
  }

  return (
    <div className="view chat-view page-enter">
      <DragBackHeader className="chat-header">
        <img className="chat-header-call-icon general-chat-phone" src="/icons/help/phone.svg" alt="" />
        <div><h1>AI 안내 가온</h1><span><i /> 온라인</span></div>
        <button className="exit-compact transition active:scale-95" onClick={onQuickExit} aria-label="긴급 종료"><Power size={19} /> 긴급종료</button>
      </DragBackHeader>
      <div className="privacy-strip"><LockKeyhole size={17} /> 대화는 익명으로 임시 저장되며 긴급 종료 시 즉시 삭제돼요.</div>
      <div className="messages" aria-live="polite">
        <div className="time-marker">오늘 · 익명 대화</div>
        {messages.map((message) => message.role === 'emote' ? (
          <div className="message emote" key={message.id}>
            <img className="chat-emote" src={CHAT_EMOTES[message.emote].src} alt={CHAT_EMOTES[message.emote].alt} />
          </div>
        ) : (
          <div className={`message ${message.role}`} key={message.id}>
            {message.role === 'helper' && (message.id === 1 || message.showAvatar) && <ChatMascot className="chat-message-mascot" />}
            <p>{message.text}</p>
          </div>
        ))}
        {replying && <div className="message helper">{freeConversationMode && <ChatMascot className="chat-message-mascot" />}<p className="typing" aria-label="답변 작성 중"><i /><i /><i /></p></div>}
        {actions.length > 0 && (
          <div className={`chat-actions page-enter${showQuickReplies ? ' followed-by-replies' : ''}`}>
            {actions.includes('find-shelter') && <button className="action-shelter" onClick={() => navigate('/shelters')}><img src="/icons/help/chat-bubble.svg" alt="" /> 가까운 쉼터 보기</button>}
            {actions.includes('view-support') && <button className="action-support" onClick={() => navigate('/support')}><img src="/icons/help/chat-bubble.svg" alt="" /> 지원 사업 확인하기</button>}
            {actions.includes('call-112') && <a className="action-call" href="tel:112"><img src="/icons/help/phone.svg" alt="" /> 112 전화하기</a>}
            {actions.includes('call-1388') && <a className="action-call" href="tel:1388"><img src="/icons/help/phone.svg" alt="" /> 1388 전화하기</a>}
          </div>
        )}
        {showQuickReplies && <div className={`quick-replies stagger-grid${actions.length ? ' after-actions' : ''}`}>{quickReplies.map((reply) => <button className="group transition hover:-translate-y-0.5" key={reply} onClick={() => sendMessage(reply)}>{reply}<ChevronRight className="transition group-hover:translate-x-1" size={17} /></button>)}</div>}
        <div ref={messagesEnd} />
      </div>
      <form className="chat-composer" onSubmit={(event) => { event.preventDefault(); sendMessage(input) }}>
        <label className="sr-only" htmlFor="chat-input">상담 내용 입력</label>
        <input id="chat-input" value={input} onChange={(event) => setInput(event.target.value)} placeholder="가온에게 편하게 말해줘" autoComplete="off" />
        <button className="transition active:scale-90" type="submit" disabled={!input.trim() || replying} aria-label="보내기"><Navigation size={23} fill="currentColor" /></button>
      </form>
      <p className="chat-demo-note">AI가 안내하며, 익명 상담 세션은 24시간 후 자동 만료돼요.</p>
    </div>
  )
}
