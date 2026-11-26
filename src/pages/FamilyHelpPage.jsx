import { ChevronDown, ChevronRight, ExternalLink, Heart, MapPin, MessagesSquare, Phone, TriangleAlert } from 'lucide-react'
import { Link, Navigate, useLocation, useParams } from 'react-router-dom'
import BottomNav from '../components/BottomNav.jsx'
import FeatureHeader from '../components/FeatureHeader.jsx'

const counselingCenters = {
  label: '가까운 청소년상담복지센터 찾기',
  path: '/counseling-centers'
}
const childProtectionCenters = {
  label: '가까운 아동보호전문기관 찾기',
  url: 'https://www.ncrc.or.kr/ncrc/cs/cnter/selectCnterList.do?cnterId=1002&mi=1122'
}
const youthShelters = {
  label: '가까운 청소년쉼터 찾기',
  url: 'https://www.1388.go.kr/sfi/YTOSP_SC_SFI_01?untwktValue=U04'
}

const topics = [
  {
    id: 'conflict', title: '부모님·가족과 갈등이 있어요', icon: MessagesSquare, tone: 'peach',
    agency: counselingCenters,
    examples: [
      { home: '부모님 두 집을 오가며 살 때', story: '주말에 어느 집에서 지낼지 정할 때마다 내 의견을 말하기 어려워요.' },
      { home: '할머니와 함께 살 때', story: '친구를 만나고 돌아오는 시간을 두고 자꾸 다퉈요. 어떻게 말을 꺼내면 좋을까요?' }
    ],
    now: '말다툼이 격해지면 잠깐 대화를 멈추고 편하게 숨을 고를 수 있는 곳으로 이동해 보세요. 믿을 수 있는 사람에게 먼저 이야기해도 돼요.',
    where: '청소년상담1388에 집에서 있었던 일을 이야기하거나, 가까운 청소년상담복지센터에 상담을 신청할 수 있어요.',
    next: '상담원이 가장 힘들었던 점을 듣고 원하는 도움을 물어요. 가족과 대화하는 방법을 함께 찾거나 지역에서 받을 수 있는 상담을 안내해요.',
    related: ['violence', 'distress']
  },
  {
    id: 'violence', title: '폭언이나 폭력을 겪고 있어요', artwork: '/icons/help/family-violence.png', tone: 'rose', urgent: true,
    agency: childProtectionCenters,
    examples: [
      { home: '부모님과 함께 살 때', story: '화가 날 때마다 나한테 욕을 하고 물건을 던져서 무서워요.' },
      { home: '형제자매와 함께 살 때', story: '형이 나를 때렸는데 가족들이 그냥 둘이서 풀라고 해요. 다른 어른에게 도움을 청하고 싶어요.' }
    ],
    now: '지금 위협을 받고 있다면 가능할 때 사람이 있는 안전한 곳으로 이동하고 112에 알려 주세요. 상대를 설득하거나 증거를 모으려고 위험한 곳에 머물 필요는 없어요.',
    where: '진행 중인 폭력이나 아동학대는 112에 신고할 수 있어요. 이후 어디서 지내거나 상담받을지 고민된다면 1388에 이야기해 주세요.',
    next: '112에 연락하면 경찰이 위치와 위험 상황을 확인해요. 1388에서는 지금 안전한지 먼저 살피고 지역 상담·보호기관을 함께 찾아요.',
    related: ['unsafe', 'care']
  },
  {
    id: 'care', title: '보호자의 돌봄을 받지 못하고 있어요', artwork: '/icons/help/family-care.png', tone: 'sage', urgent: true,
    agency: childProtectionCenters,
    examples: [
      { home: '보호자 한 분과 살 때', story: '보호자가 며칠째 집을 비웠고 연락도 닿지 않아요. 먹을 게 떨어졌는데 누구에게 말해야 할까요?' },
      { home: '동생과 집에 남겨졌을 때', story: '동생이 아픈데 돌봐 줄 어른과 연락이 안 돼요. 나 혼자 챙기기 어려워요.' }
    ],
    now: '오늘 먹을 것, 잘 곳이나 아플 때 돌봐 줄 사람이 없다면 믿을 수 있는 어른에게 지금 필요한 것을 알려 주세요. 당장 위험하거나 학대·방임을 신고하려면 112에 연락할 수 있어요.',
    where: '1388이나 가까운 청소년상담복지센터에 식사, 잠자리, 돌봄 중 무엇이 필요한지 이야기해 보세요.',
    next: '상담원이 지금 필요한 도움과 지낼 곳을 확인하고, 지역에서 이용할 수 있는 보호·생활 지원기관을 안내해요.',
    related: ['unsafe', 'unsure']
  },
  {
    id: 'unsafe', title: '집에 있는 것이 안전하지 않아요', artwork: '/icons/help/family-unsafe.png', tone: 'sand', urgent: true,
    agency: youthShelters,
    examples: [
      { home: '가족과 한집에 살 때', story: '가족끼리 몸싸움이 벌어져 잠깐 밖으로 나왔어요. 오늘 밤 안전하게 지낼 곳이 필요해요.' },
      { home: '친척 집에서 지낼 때', story: '오늘 당장 나가라는 말을 들었어요. 돌아갈 집도, 하룻밤 머물 곳도 없어요.' }
    ],
    now: '집 안에서 위험이 계속된다면 이동할 수 있을 때 가까운 편의점이나 경찰관서처럼 도움을 청할 사람이 있는 곳으로 가세요. 지금 위협을 받고 있다면 112로 연락해 주세요.',
    where: '오늘 안전하게 머물 곳이 필요하다고 1388에 이야기하세요. 쉼터 지도에서 가까운 곳에 직접 전화해 볼 수도 있어요.',
    next: '상담원이 현재 위치와 안전을 확인하고 이용할 수 있는 쉼터나 보호기관을 찾아줘요. 이동하기 전에 쉼터와 통화해 입소 가능 여부를 확인하세요.',
    related: ['violence', 'care']
  },
  {
    id: 'distress', title: '마음이 너무 힘들어요', icon: Heart, tone: 'lilac',
    agency: counselingCenters,
    examples: [
      { home: '부모님의 재혼으로 새 가족과 살 때', story: '새 집에서는 아직 손님처럼 느껴져요. 부모님이 속상해하실까 봐 마음을 털어놓기 어려워요.' },
      { home: '가족이 병원에 오래 머물 때', story: '집에 오면 적적하고 걱정 때문에 잠이 잘 안 와요. 내 이야기도 누군가 들어줬으면 해요.' }
    ],
    now: '편하게 연락할 수 있는 사람에게 “지금 마음이 힘들어서 잠깐 같이 있어 줬으면 해”라고 말해 보세요. 마음을 다 설명하지 않아도 돼요.',
    where: '1388에서는 밤에도 전화로 상담할 수 있어요. 직접 만나 이야기하고 싶다면 가까운 청소년상담복지센터에 문의해 보세요.',
    next: '상담원이 지금의 기분과 필요한 도움을 듣고, 오늘을 보내는 방법을 함께 찾아요. 원하면 지역 상담센터에서 상담을 이어가는 방법도 물어볼 수 있어요.',
    related: ['conflict', 'unsure']
  },
  {
    id: 'unsure', title: '어디에 도움을 요청할지 모르겠어요', artwork: '/icons/help/family-unsure.png', tone: 'blue',
    agency: counselingCenters,
    examples: [
      { home: '보호자가 바뀌어 친척 집으로 옮겼을 때', story: '전학도 해야 하고 생활비도 걱정돼요. 어느 것부터 누구에게 물어봐야 할지 모르겠어요.' },
      { home: '가족과 떨어져 지낼 때', story: '그동안 친구 집에 머물렀는데 더 지내기는 어려워요. 집 문제와 마음 문제를 같이 이야기해도 될까요?' }
    ],
    now: '“어디에 물어봐야 할지 모르겠어요”라고 시작해도 괜찮아요. 가장 걱정되는 일 한 가지부터 이야기해 보세요.',
    where: '청소년상담1388에 전화해 이야기를 시작할 수 있어요. 직접 만나고 싶다면 가까운 청소년상담복지센터를 찾아보세요.',
    next: '상담원이 이야기를 들으며 지금 먼저 해결하고 싶은 일을 같이 정리해요. 필요한 기관의 연락처와 이용 방법을 안내받을 수 있어요.',
    related: ['conflict', 'unsafe', 'distress']
  }
]

function TopicIcon({ topic, size = 24 }) {
  const Icon = topic.icon
  return <span className={`help-icon ${topic.tone}`} aria-hidden="true">
    {topic.artwork ? <img src={topic.artwork} alt="" /> : <Icon size={size} />}
  </span>
}

function TopicLink({ topic, from }) {
  return (
    <Link className="family-topic" to={`/family-help/${topic.id}`} state={{ from }}>
      <TopicIcon topic={topic} size={21} />
      <span>{topic.title}</span><ChevronRight size={17} aria-hidden="true" />
    </Link>
  )
}

function TopicGuide({ topic, from }) {
  return (
    <article className="family-guide">
      <div className="family-guide-title"><TopicIcon topic={topic} /><h1>{topic.title}</h1></div>
      {topic.urgent && <a className="family-emergency" href="tel:112"><TriangleAlert size={17} /> 지금 위험하면 112에 신고하기</a>}
      <section><h2>지금 해볼 수 있는 방법</h2><p>{topic.now}</p></section>
      <section><h2>어디에서 도움받을 수 있나요?</h2><p>{topic.where}</p>
        {topic.id === 'unsafe' && <Link className="help-text-link" to="/shelters"><MapPin size={15} /> 가까운 쉼터 지도 보기</Link>}
      </section>
      <section><h2>상담을 요청하면 어떻게 진행되나요?</h2><p>{topic.next}</p></section>
      <div className="family-contacts">
        <a className="help-primary" href="tel:1388"><Phone size={16} /> 1388 전화 상담</a>
        {topic.agency.path
          ? <Link className="help-secondary" to={topic.agency.path} state={{ topicId: topic.id, from }}>{topic.agency.label} <ChevronRight size={14} /></Link>
          : <a className="help-secondary" href={topic.agency.url} target="_blank" rel="noreferrer">{topic.agency.label} <ExternalLink size={14} /></a>}
        <small>휴대전화에서는 지역번호와 1388을 함께 눌러주세요.</small>
      </div>
      <details className="family-related">
        <summary>비슷한 상황 알아보기 <ChevronDown size={16} /></summary>
        <dl className="family-examples">
          {topic.examples.map(({ home, story }) => (
            <div key={home}><dt>{home}</dt><dd>“{story}”</dd></div>
          ))}
        </dl>
        {topic.related.map((id) => <TopicLink key={id} topic={topics.find((item) => item.id === id)} from={from} />)}
      </details>
    </article>
  )
}

export default function FamilyHelpPage({ onQuickExit }) {
  const { topicId } = useParams()
  const { state } = useLocation()
  const from = state?.from === '/shelters' ? '/shelters' : '/home'
  const topic = topics.find((item) => item.id === topicId)
  if (topicId && !topic) return <Navigate to="/family-help" state={{ from }} replace />
  return (
    <div className="feature-shell legal-shell plain-back-arrow">
      <FeatureHeader title="가정 문제 도움" backTo={topic ? '/family-help' : from} backState={topic ? { from } : undefined} onQuickExit={onQuickExit} />
      <main key={topicId || 'topics'} className="legal-main family-main">
        {topic ? <TopicGuide topic={topic} from={from} /> : (
          <>
            <div className="legal-picker-heading">
              <img className="family-house-icon" src="/icons/help/family-house.svg" alt="" />
              <div><h1>집에서 어떤 어려움을 겪고 있나요?</h1><p>지금 상황과 가까운 항목을 골라 주세요.</p></div>
            </div>
            <nav className="family-topic-list" aria-label="상황별 도움">
              {topics.map((item) => <TopicLink key={item.id} topic={item} from={from} />)}
            </nav>
            <a className="family-emergency" href="tel:112"><TriangleAlert size={16} /> 지금 위험하면 112에 신고하기</a>
          </>
        )}
      </main>
      <BottomNav warm />
    </div>
  )
}
