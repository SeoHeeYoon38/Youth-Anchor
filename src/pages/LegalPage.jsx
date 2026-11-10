import { BriefcaseBusiness, Check, ChevronRight, ExternalLink, Home, MessageCircle, Phone, Send, ShieldCheck } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import FeatureHeader from '../components/FeatureHeader.jsx'

const ASSET_ROOT = '/figma/features'
const TASKS_KEY = 'haven-diary-tasks'

const INITIAL_MESSAGE = '알바하면서 힘든 일이 있었군요. 어떤 일이었는지 선택해줄래요?'
const ISSUE_OPTIONS = ['돈을 덜 받았어요', '갑자기 잘렸어요', '다쳤어요', '욕, 폭언을 들었어요']
const EVIDENCE_OPTIONS = ['근로 계약서', '출퇴근 기록, 사진', '문자 기록', '아무것도 없어요']

function readTasks() {
  try {
    const saved = JSON.parse(localStorage.getItem(TASKS_KEY) || '[]')
    return Array.isArray(saved) ? saved : []
  } catch {
    return []
  }
}

function LegalShell({ title, onQuickExit, backTo, children }) {
  const { pathname } = useLocation()
  const shellRef = useRef(null)

  useEffect(() => { shellRef.current?.scrollTo({ top: 0 }) }, [pathname])

  return (
    <div className="feature-shell legal-shell" ref={shellRef}>
      <FeatureHeader title={title} onQuickExit={onQuickExit} backTo={backTo} />
      <main className="legal-main">{children}</main>
    </div>
  )
}

export function LegalHomePage({ onQuickExit }) {
  const navigate = useNavigate()

  return (
    <LegalShell title="법률 상담" onQuickExit={onQuickExit} backTo="/home">
      <section className="legal-hero">
        <span className="legal-hero-icon"><ShieldCheck size={30} /></span>
        <small>익명으로 안전하게</small>
        <h1>혼자 버티지 않아도 괜찮아요</h1>
        <p>부당한 일을 겪었다면 상황을 차근차근 정리하고, 어디에 도움을 요청할지 함께 찾아볼게요.</p>
      </section>
      <section className="legal-menu" aria-label="법률 상담 분야">
        <button type="button" onClick={() => navigate('/legal/chat')}>
          <span><BriefcaseBusiness size={25} /></span>
          <strong>노동권 보호</strong>
          <small>알바비, 해고, 다침, 폭언 대응</small>
          <ChevronRight size={20} />
        </button>
        <a href="tel:1350">
          <span><Phone size={25} /></span>
          <strong>고용노동부 1350</strong>
          <small>평일 상담 시간에 전화 연결</small>
          <ChevronRight size={20} />
        </a>
      </section>
      <aside className="legal-safety-note"><ShieldCheck size={20} /><span><strong>지금 위험하거나 다쳤다면</strong><small>안전한 장소로 이동한 뒤 112 또는 119에 먼저 연락해 주세요.</small></span></aside>
      <nav className="legal-mini-nav"><button type="button" onClick={() => navigate('/home')}><Home size={20} />홈</button><button type="button" className="active" onClick={() => navigate('/legal/chat')}><MessageCircle size={20} />상담 시작</button></nav>
    </LegalShell>
  )
}

function BotMessage({ children }) {
  return <div className="legal-message-row bot"><img src={`${ASSET_ROOT}/legal-phone.png`} alt="가온" /><div className="legal-bubble">{children}</div></div>
}

function UserMessage({ children }) {
  return <div className="legal-message-row user"><div className="legal-bubble">{children}</div></div>
}

export function LegalChatPage({ onQuickExit }) {
  const [messages, setMessages] = useState([{ id: 1, role: 'bot', text: INITIAL_MESSAGE }])
  const [stage, setStage] = useState(0)
  const [draft, setDraft] = useState('')
  const [saved, setSaved] = useState(false)
  const endRef = useRef(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }) }, [messages])

  const chooseIssue = (option) => {
    setMessages((current) => [...current, { id: Date.now(), role: 'user', text: option }, { id: Date.now() + 1, role: 'bot', text: '확인했어요. 지금 가지고 있는 기록이 있나요?' }])
    setStage(1)
  }

  const chooseEvidence = (option) => {
    setMessages((current) => [...current, { id: Date.now(), role: 'user', text: option }, {
      id: Date.now() + 1,
      role: 'bot',
      text: '일한 시간만큼 최저임금 이상 받는 건 나이와 상관없는 권리예요. 이제 방법을 알려줄게요.',
      steps: ['증거 화면을 따로 캡처해 저장하기', '일한 날짜와 시간을 일기장에 적기', '고용노동부 1350에 신고 방법 물어보기']
    }])
    setStage(2)
  }

  const submitDraft = (event) => {
    event.preventDefault()
    const value = draft.trim()
    if (!value) return
    setMessages((current) => [...current, { id: Date.now(), role: 'user', text: value }, { id: Date.now() + 1, role: 'bot', text: '말해줘서 고마워요. 정확한 판단이 필요한 내용은 1350 상담원에게 그대로 설명해 주세요. 지금 가진 기록은 지우지 말고 따로 보관해요.' }])
    setDraft('')
    setStage(2)
  }

  const saveChecklist = () => {
    const existing = readTasks()
    const texts = ['근무 기록 캡처 저장하기', '일한 날짜와 시간 적기', '1350에 상담하기']
    const additions = texts.filter((text) => !existing.some((task) => task.text === text)).map((text, index) => ({ id: `${Date.now()}-${index}`, text, done: false }))
    localStorage.setItem(TASKS_KEY, JSON.stringify([...existing, ...additions]))
    setSaved(true)
  }

  return (
    <LegalShell title="노동권 보호" onQuickExit={onQuickExit} backTo="/legal">
      <div className="legal-status"><span /> 익명 상담</div>
      <aside className="legal-privacy"><ShieldCheck size={18} /> 대화는 익명으로 임시 표시되며, 긴급 종료 시 즉시 사라져요.</aside>
      <section className="legal-chat-log" aria-live="polite">
        {messages.map((message) => message.role === 'bot' ? <BotMessage key={message.id}><p>{message.text}</p>{message.steps && <ol>{message.steps.map((step) => <li key={step}>{step}</li>)}</ol>}</BotMessage> : <UserMessage key={message.id}>{message.text}</UserMessage>)}
        {stage === 0 && <div className="legal-choices">{ISSUE_OPTIONS.map((option) => <button type="button" key={option} onClick={() => chooseIssue(option)}>{option}</button>)}</div>}
        {stage === 1 && <div className="legal-choices">{EVIDENCE_OPTIONS.map((option) => <button type="button" key={option} onClick={() => chooseEvidence(option)}>{option}</button>)}</div>}
        {stage === 2 && <div className="legal-actions"><a href="tel:1350"><Phone size={17} />1350 전화하기</a><button type="button" onClick={saveChecklist}>{saved ? <Check size={17} /> : <ExternalLink size={17} />}{saved ? '체크리스트에 저장됨' : '체크리스트 저장'}</button></div>}
        <div ref={endRef} />
      </section>
      <form className="legal-input" onSubmit={submitDraft}><textarea value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="편하게 적어주세요." aria-label="상담 내용" /><button type="submit" aria-label="보내기"><Send size={20} /></button></form>
      <p className="legal-disclaimer">가온은 법률 판단을 대신하지 않아요. 공식 기관 상담을 함께 확인해 주세요.</p>
    </LegalShell>
  )
}
