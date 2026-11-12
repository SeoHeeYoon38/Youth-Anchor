import { Check, ChevronRight, ClipboardCheck, LockKeyhole, Navigation, Phone, Power, RotateCcw } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import BottomNav from '../components/BottomNav.jsx'
import FeatureHeader from '../components/FeatureHeader.jsx'

const ASSET_ROOT = '/figma/features'
const TASKS_KEY = 'haven-diary-tasks'

const INITIAL_MESSAGE = '알바하면서 힘든 일이 있었군요. 어떤 일이었는지 선택해줄래요?'
const ISSUE_OPTIONS = ['돈을 덜 받았어요', '갑자기 잘렸어요', '다쳤어요', '욕, 폭언을 들었어요']
const EVIDENCE_OPTIONS = ['근로 계약서', '출퇴근 기록, 사진', '문자 기록', '아무것도 없어요']

const LEGAL_TOPICS = [
  { id: 'labor', title: '노동권 보호', description: '알바하면서 부당한 대우를 받았을 때 선택하세요', icon: `${ASSET_ROOT}/legal-briefcase.svg`, tone: 'labor' },
  { id: 'school', title: '학교폭력 대응', description: '학교 안팎에서 괴롭힘을 당했을 때 선택하세요', icon: `${ASSET_ROOT}/legal-graduation.svg`, tone: 'school' },
  { id: 'digital', title: '디지털 범죄 대응', description: '온라인 협박이나 사진 유포 피해를 당했을 때 선택하세요', icon: `${ASSET_ROOT}/legal-smartphone.svg`, tone: 'digital' },
  { id: 'family', title: '가정폭력·아동학대', description: '가정에서 안전을 위협받을 때 선택하세요', icon: `${ASSET_ROOT}/legal-home-heart.svg`, tone: 'family' },
  { id: 'money', title: '금전·사기 피해', description: '온라인 사기나 돈을 빼앗겼을 때 선택하세요', icon: `${ASSET_ROOT}/legal-dollar.svg`, tone: 'money' }
]

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
      <BottomNav warm supportLast />
    </div>
  )
}

export function LegalHomePage({ onQuickExit }) {
  const navigate = useNavigate()

  return (
    <LegalShell title="법률 상담" onQuickExit={onQuickExit} backTo="/home">
      <section className="legal-picker" aria-labelledby="legal-picker-title">
        <div className="legal-picker-heading">
          <span className="legal-picker-symbol"><img src={`${ASSET_ROOT}/legal-scale.svg`} alt="" /></span>
          <span>
            <h1 id="legal-picker-title">어떤 일이 있었는지 골라 주세요!</h1>
            <p>이름이나 학교는 말하지 않아도 괜찮아요</p>
          </span>
        </div>
        <div className="legal-topic-list" aria-label="법률 상담 분야">
          {LEGAL_TOPICS.map(({ id, title, description, icon, tone }) => (
            <button type="button" key={id} onClick={() => navigate('/legal/chat', { state: { topic: id } })}>
              <span className={`legal-topic-icon ${tone}`}><img src={icon} alt="" /></span>
              <span className="legal-topic-copy"><strong>{title}</strong><small>{description}</small></span>
              <ChevronRight size={22} aria-hidden="true" />
            </button>
          ))}
        </div>
        <p className="legal-safety-copy">지금 위험한 상황이라면 <strong>112</strong>, 다쳤다면 <strong>119</strong>에 먼저 연락하세요. 여기 안내는 법률 정보이고 변호사 상담을 대신하지 않아요.</p>
      </section>
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

  useEffect(() => {
    if (messages.length > 1) endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [messages])

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

  const restartConversation = () => {
    setMessages((current) => [...current, { id: Date.now(), role: 'bot', text: INITIAL_MESSAGE }])
    setStage(0)
    setDraft('')
  }

  return (
    <div className="feature-shell legal-shell legal-chat-shell">
      <header className="chat-header legal-chat-header">
        <span className="chat-header-call-icon" aria-hidden="true"><Phone size={25} /></span>
        <div><h1>노동권 보호</h1><span><i /> 온라인</span></div>
        <button className="exit-compact" type="button" onClick={onQuickExit} aria-label="긴급 종료"><Power size={19} /> 긴급종료</button>
      </header>
      <div className="privacy-strip"><LockKeyhole size={17} /> 대화는 익명으로 임시 저장되며 긴급 종료 시 즉시 삭제돼요.</div>
      <main className="legal-chat-main">
        <section className="legal-chat-log" aria-live="polite">
          {messages.map((message) => message.role === 'bot' ? <BotMessage key={message.id}><p>{message.text}</p>{message.steps && <ol>{message.steps.map((step) => <li key={step}>{step}</li>)}</ol>}</BotMessage> : <UserMessage key={message.id}>{message.text}</UserMessage>)}
          {stage === 0 && <div className="legal-choices">{ISSUE_OPTIONS.map((option) => <button type="button" key={option} onClick={() => chooseIssue(option)}>{option}</button>)}</div>}
          {stage === 1 && <div className="legal-choices">{EVIDENCE_OPTIONS.map((option) => <button type="button" key={option} onClick={() => chooseEvidence(option)}>{option}</button>)}</div>}
          {stage === 2 && <div className="legal-actions"><a href="tel:1350"><Phone size={17} />1350 전화하기</a><button type="button" onClick={saveChecklist}>{saved ? <Check size={17} /> : <ClipboardCheck size={17} />}{saved ? '체크리스트에 추가됨' : '체크리스트에 추가'}</button></div>}
          <div ref={endRef} />
        </section>
        <button type="button" className="legal-restart" onClick={restartConversation}><RotateCcw size={17} /> 처음으로</button>
        <p className="legal-disclaimer">가온은 법률 판단을 대신하지 않아요. 공식 기관 상담을 함께 확인해 주세요.</p>
      </main>
      <form className="chat-composer legal-chat-composer" onSubmit={submitDraft}>
        <label className="sr-only" htmlFor="legal-chat-input">상담 내용 입력</label>
        <input id="legal-chat-input" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="가온에게 편하게 말해줘" autoComplete="off" />
        <button type="submit" disabled={!draft.trim()} aria-label="보내기"><Navigation size={23} fill="currentColor" /></button>
      </form>
      <BottomNav warm supportLast />
    </div>
  )
}
