import { Check, ChevronRight, ClipboardCheck, LockKeyhole, Navigation, Phone, Power } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import BottomNav from '../components/BottomNav.jsx'
import FeatureHeader from '../components/FeatureHeader.jsx'
import { fetchLegalTopic, fetchLegalTopics, fetchUserData, saveUserData } from '../api.js'
import { addChecklistItems, mergeChecklists, readChecklist, writeChecklist } from '../checklistStore.js'

const ASSET_ROOT = '/figma/features'

const LEGAL_TOPICS = [
  { id: 'labor', title: '노동권 보호', description: '알바하면서 부당한 대우를 받았을 때 선택하세요', icon: `${ASSET_ROOT}/legal-briefcase.svg`, tone: 'labor' },
  { id: 'school', title: '학교폭력 대응', description: '학교 안팎에서 괴롭힘을 당했을 때 선택하세요', icon: `${ASSET_ROOT}/legal-graduation.svg`, tone: 'school' },
  { id: 'digital', title: '디지털 범죄 대응', description: '온라인 협박이나 사진 유포 피해를 당했을 때 선택하세요', icon: `${ASSET_ROOT}/legal-smartphone.svg`, tone: 'digital' },
  { id: 'family', title: '가정폭력·아동학대', description: '가정에서 안전을 위협받을 때 선택하세요', icon: `${ASSET_ROOT}/legal-home-heart.svg`, tone: 'family' },
  { id: 'money', title: '금전·사기 피해', description: '온라인 사기나 돈을 빼앗겼을 때 선택하세요', icon: `${ASSET_ROOT}/legal-dollar.svg`, tone: 'money' }
]

const LEGAL_CONVERSATIONS = {
  labor: {
    title: '노동권 보호',
    initialMessage: '알바하면서 힘든 일이 있었군요. 어떤 일이었는지 선택해줄래요?',
    issueOptions: ['돈을 덜 받았어요', '갑자기 잘렸어요', '다쳤어요', '욕, 폭언을 들었어요'],
    evidenceOptions: ['근로 계약서', '출퇴근 기록, 사진', '문자 기록', '아무것도 없어요'],
    result: '일한 시간만큼 최저임금 이상 받는 건 나이와 상관없는 권리예요. 이제 방법을 알려줄게요.',
    steps: ['증거 화면을 따로 캡처해 저장하기', '일한 날짜와 시간을 일기장에 적기', '고용노동부 1350에 신고 방법 물어보기'],
    checklist: ['근무 기록 캡처 저장하기', '일한 날짜와 시간 적기', '1350에 상담하기'],
    contact: { href: 'tel:1350', label: '1350 전화하기' }
  },
  school: {
    title: '학교폭력 대응',
    initialMessage: '학교 안팎에서 힘든 일이 있었군요. 어떤 일이었는지 선택해줄래요?',
    issueOptions: ['친구에게 괴롭힘을 당했어요', '단체로 따돌림을 당했어요', '온라인에서 괴롭힘을 당했어요', '다치거나 위협받았어요'],
    evidenceOptions: ['문자·채팅 기록', '사진·영상', '학교에 알린 기록', '아무것도 없어요'],
    result: '괴롭힘은 참아야 하는 일이 아니에요. 안전을 먼저 지키면서 도움을 요청할 수 있어요.',
    steps: ['메시지와 사진을 지우지 않고 보관하기', '믿을 수 있는 보호자나 교사에게 알리기', '학교폭력 신고·상담 117에 연락하기'],
    checklist: ['학교폭력 기록 보관하기', '믿을 수 있는 어른에게 알리기', '117에 상담하기'],
    contact: { href: 'tel:117', label: '117 전화하기' }
  },
  digital: {
    title: '디지털 범죄 대응',
    initialMessage: '온라인에서 불안한 일을 겪었군요. 어떤 일이었는지 선택해줄래요?',
    issueOptions: ['협박을 받았어요', '사진·영상이 퍼졌어요', '계정이 도용됐어요', '온라인 사기를 당했어요'],
    evidenceOptions: ['대화 화면 캡처', '게시물 주소', '결제·송금 기록', '아무것도 없어요'],
    result: '혼자 해결하려고 상대방과 계속 연락하지 않아도 돼요. 증거를 남기고 도움을 요청해요.',
    steps: ['대화와 게시물 화면을 캡처하기', '계정 비밀번호를 바꾸고 신고하기', '긴급하면 112 또는 1388에 연락하기'],
    checklist: ['온라인 피해 화면 저장하기', '계정 보안 확인하기', '전문기관에 상담하기'],
    contact: { href: 'tel:112', label: '112 전화하기' }
  },
  family: {
    title: '가정폭력·아동학대',
    initialMessage: '집에서 안전하지 않은 일을 겪었군요. 지금 상황과 가장 가까운 것을 골라줄래요?',
    issueOptions: ['집에서 맞거나 위협받았어요', '집에 있기가 무서워요', '돌봄을 받지 못하고 있어요', '가족이 위험해요'],
    evidenceOptions: ['다친 곳의 사진', '문자·통화 기록', '도움을 요청한 기록', '아무것도 없어요'],
    result: '무엇보다 지금 안전한 곳으로 이동하는 게 먼저예요. 네 잘못이 아니고 도움을 요청해도 돼요.',
    steps: ['가까운 안전한 장소로 이동하기', '믿을 수 있는 어른에게 알리기', '지금 위험하면 112에 연락하기'],
    checklist: ['안전하게 머물 곳 확인하기', '믿을 수 있는 어른에게 알리기', '112 또는 1388에 상담하기'],
    contact: { href: 'tel:112', label: '112 전화하기' }
  },
  money: {
    title: '금전·사기 피해',
    initialMessage: '돈과 관련해 곤란한 일을 겪었군요. 어떤 일이었는지 선택해줄래요?',
    issueOptions: ['돈을 빌려주고 못 받았어요', '온라인 사기를 당했어요', '내 명의로 결제됐어요', '강제로 돈을 빼앗겼어요'],
    evidenceOptions: ['송금·결제 기록', '대화 화면 캡처', '판매 글·계정 정보', '아무것도 없어요'],
    result: '추가로 돈을 보내거나 상대방과 거래하지 말고, 남아 있는 기록부터 안전하게 보관해요.',
    steps: ['송금과 대화 기록을 캡처하기', '은행이나 결제사에 피해를 알리기', '경찰 112 또는 금융상담 1332에 문의하기'],
    checklist: ['송금·결제 기록 저장하기', '은행·결제사에 알리기', '112 또는 1332에 상담하기'],
    contact: { href: 'tel:1332', label: '1332 전화하기' }
  }
}

function LegalShell({ title, onQuickExit, backTo, hideBack = false, children }) {
  const { pathname } = useLocation()
  const shellRef = useRef(null)

  useEffect(() => { shellRef.current?.scrollTo({ top: 0 }) }, [pathname])

  return (
    <div className={`feature-shell legal-shell ${hideBack ? 'legal-shell-hide-back' : ''}`} ref={shellRef}>
      <FeatureHeader title={title} onQuickExit={onQuickExit} backTo={backTo} />
      <main className="legal-main">{children}</main>
      <BottomNav warm supportLast />
    </div>
  )
}

export function LegalHomePage({ onQuickExit }) {
  const navigate = useNavigate()
  const [topics, setTopics] = useState(LEGAL_TOPICS)

  useEffect(() => {
    let active = true
    fetchLegalTopics().then((items) => {
      if (active && items.length) setTopics(items)
    }).catch(() => {})
    return () => { active = false }
  }, [])

  return (
    <LegalShell title="법률 상담" onQuickExit={onQuickExit} backTo="/home" hideBack>
      <section className="legal-picker" aria-labelledby="legal-picker-title">
        <div className="legal-picker-heading">
          <span className="legal-picker-symbol"><img src={`${ASSET_ROOT}/legal-scale.svg`} alt="" /></span>
          <span>
            <h1 id="legal-picker-title">어떤 일이 있었는지 골라 주세요!</h1>
            <p>이름이나 학교는 말하지 않아도 괜찮아요</p>
          </span>
        </div>
        <div className="legal-topic-list" aria-label="법률 상담 분야">
          {topics.map(({ id, title, description, icon, tone }) => (
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
  return <div className="legal-message-row bot"><img src="/figma/warm/chat-bear-face-cutout.png" alt="가온" /><div className="legal-bubble">{children}</div></div>
}

function UserMessage({ children }) {
  return <div className="legal-message-row user"><div className="legal-bubble">{children}</div></div>
}

export function LegalChatPage({ onQuickExit }) {
  const navigate = useNavigate()
  const { state } = useLocation()
  const topicId = state?.topic || 'labor'
  const [topic, setTopic] = useState(LEGAL_CONVERSATIONS[topicId] || LEGAL_CONVERSATIONS.labor)
  const [messages, setMessages] = useState([{ id: 1, role: 'bot', text: topic.initialMessage }])
  const [stage, setStage] = useState(0)
  const [draft, setDraft] = useState('')
  const [saved, setSaved] = useState(false)
  const endRef = useRef(null)

  useEffect(() => {
    let active = true
    fetchLegalTopic(topicId).then((item) => {
      if (active && item.guide) setTopic(item.guide)
    }).catch(() => {})
    return () => { active = false }
  }, [topicId])

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
      text: topic.result,
      steps: topic.steps
    }])
    setStage(2)
  }

  const submitDraft = (event) => {
    event.preventDefault()
    const value = draft.trim()
    if (!value) return
    setMessages((current) => [...current, { id: Date.now(), role: 'user', text: value }, { id: Date.now() + 1, role: 'bot', text: '말해줘서 고마워요. 정확한 판단이 필요한 내용은 전문 상담기관에 그대로 설명해 주세요. 지금 가진 기록은 지우지 말고 따로 보관해요.' }])
    setDraft('')
    setStage(2)
  }

  const saveChecklist = async () => {
    const local = readChecklist()
    let remote = []
    try {
      remote = (await fetchUserData('checklist')).data || []
    } catch {
      // 네트워크가 없어도 이 기기에서는 즉시 사용할 수 있어요.
    }
    const next = addChecklistItems(mergeChecklists(local, remote), topic.checklist, `legal:${topicId}`)
    writeChecklist(next)
    saveUserData('checklist', next).catch(() => {})
    setSaved(true)
  }

  const restartConversation = () => {
    setMessages((current) => [...current, { id: Date.now(), role: 'bot', text: topic.initialMessage }])
    setStage(0)
    setDraft('')
  }

  return (
    <div className="feature-shell legal-shell legal-chat-shell">
      <header className="chat-header legal-chat-header">
        <span className="chat-header-call-icon" aria-hidden="true"><Phone size={25} /></span>
        <div><h1>{topic.title}</h1><span><i /> 온라인</span></div>
        <button className="exit-compact" type="button" onClick={onQuickExit} aria-label="긴급 종료"><Power size={19} /> 긴급종료</button>
      </header>
      <div className="privacy-strip"><LockKeyhole size={17} /> 대화는 익명으로 임시 저장되며 긴급 종료 시 즉시 삭제돼요.</div>
      <main className="legal-chat-main">
        <section className="legal-chat-log" aria-live="polite">
          {messages.map((message) => message.role === 'bot' ? <BotMessage key={message.id}><p>{message.text}</p>{message.steps && <ol>{message.steps.map((step) => <li key={step}>{step}</li>)}</ol>}</BotMessage> : <UserMessage key={message.id}>{message.text}</UserMessage>)}
          <div className="legal-quick-row">
            {stage === 0 && <div className="legal-choices">{topic.issueOptions.map((option) => <button type="button" key={option} onClick={() => chooseIssue(option)}>{option}</button>)}</div>}
            {stage === 1 && <div className="legal-choices">{topic.evidenceOptions.map((option) => <button type="button" key={option} onClick={() => chooseEvidence(option)}>{option}</button>)}</div>}
            {stage === 2 && <div className="legal-actions"><a href={topic.contact.href}><Phone size={17} />{topic.contact.label}</a><button type="button" onClick={saveChecklist}>{saved ? <Check size={17} /> : <ClipboardCheck size={17} />}{saved ? '체크리스트에 추가됨' : '체크리스트에 추가'}</button></div>}
            <button type="button" className="legal-restart" onClick={restartConversation}>처음으로</button>
            <button type="button" className="legal-restart" onClick={() => navigate('/legal')}>홈</button>
          </div>
          <div ref={endRef} />
        </section>
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
