import { Check, ChevronLeft, ChevronRight, ExternalLink, FolderOpen, Grid2X2, Search } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import FeatureHeader from '../components/FeatureHeader.jsx'

const ASSET_ROOT = '/figma/features'
const CHECKLIST_KEY = 'haven-rights-checklist'

const BOOKS = [
  { id: 'resident', title: '주민등록등본·초본', shortTitle: '주민등록\n등본·초본', category: '생활', tone: 'resident', icon: 'rights-book-resident.svg' },
  { id: 'family', title: '가족관계증명서', shortTitle: '가족관계\n증명서', category: '생활', tone: 'family', icon: 'rights-book-family.svg' },
  { id: 'basic', title: '기본증명서', shortTitle: '기본증명서', category: '생활', tone: 'basic', icon: 'rights-book-basic.svg' },
  { id: 'health', title: '건강보험 자격득실확인서', shortTitle: '건강보험\n자격득실\n확인서', category: '지원', tone: 'health', icon: 'rights-book-health.svg' },
  { id: 'income', title: '소득금액증명원', shortTitle: '소득금액\n증명원', category: '지원', tone: 'income', icon: 'rights-book-income.svg' },
  { id: 'protection', title: '보호종료확인서', shortTitle: '보호종료\n확인서', category: '주거', tone: 'protection', icon: 'rights-book-coverage.svg' }
]

const DOCUMENT_DETAILS = {
  resident: {
    eyebrow: '생활 · 필수 서류',
    title: '주민등록등본·초본',
    summary: '내가 사는 곳과 누구와 살고 있는지 알려줘요. 초본은 내 주소가 바뀐 기록 등을 보여줘요.',
    uses: ['청년 월세 지원', '집 계약', '지원금 신청']
  },
  family: {
    eyebrow: '생활 · 관계 확인', title: '가족관계증명서',
    summary: '본인과 가족의 관계를 확인할 때 쓰는 서류예요. 제출처가 일반·상세 중 무엇을 요구하는지 먼저 확인해요.',
    uses: ['복지 지원', '학교 제출', '가족 관계 확인']
  },
  basic: {
    eyebrow: '생활 · 신분 확인', title: '기본증명서',
    summary: '출생과 국적 등 본인의 기본 정보를 확인하는 서류예요. 필요한 정보 범위를 제출처에 먼저 물어봐요.',
    uses: ['자립 지원', '계약 준비', '신분 정보 확인']
  },
  health: {
    eyebrow: '지원 · 가입 이력', title: '건강보험 자격득실확인서',
    summary: '건강보험 자격을 얻고 잃은 기록을 보여줘요. 취업이나 지원 사업에서 가입 이력을 확인할 때 사용해요.',
    uses: ['취업 서류', '주거 지원', '가입 이력 확인']
  },
  income: {
    eyebrow: '지원 · 소득 확인', title: '소득금액증명원',
    summary: '신고된 소득 금액을 확인하는 서류예요. 공고에서 요구하는 귀속 연도와 발급 기준을 확인해요.',
    uses: ['주거 지원', '장학금', '소득 심사']
  },
  protection: {
    eyebrow: '지원 · 자립 준비', title: '보호종료확인서',
    summary: '보호 종료 사실을 확인하는 서류예요. 발급 기관과 제출처가 요구하는 형식을 미리 확인해요.',
    uses: ['자립 수당', '주거 지원', '취업 지원']
  }
}

const PREP_ITEMS = [
  { id: 'resident', title: '주민등록등본', detail: '주소 · 세대 정보', meta: '발급일 예시 · 2026.11.01', rule: '제출처 기준 확인' },
  { id: 'family', title: '가족관계증명서', detail: '가족 관계 확인', meta: '발급일 예시 · 2026.11.01', rule: '상세·일반 여부 확인' },
  { id: 'bank', title: '통장 사본', detail: '본인 명의 · 지원금 수령 계좌', meta: '발급일 예시 · 2026.11.02', rule: '계좌 정보 확인' },
  { id: 'lease', title: '임대차계약서 사본', detail: '계약자·주소·임대료 확인', meta: '아직 준비 전', rule: '계약 내용 확인' },
  { id: 'income', title: '소득금액증명원', detail: '소득 증빙 · 공고 기준 확인', meta: '아직 준비 전', rule: '증명 대상 연도 확인' }
]

function readChecklist() {
  try {
    const saved = JSON.parse(localStorage.getItem(CHECKLIST_KEY) || 'null')
    return Array.isArray(saved) ? saved : ['resident', 'family', 'bank']
  } catch {
    return ['resident', 'family', 'bank']
  }
}

function RightsShell({ title = '권리 알리미', onQuickExit, backTo = '/home', children }) {
  const { pathname } = useLocation()
  const shellRef = useRef(null)

  useEffect(() => {
    shellRef.current?.scrollTo({ top: 0 })
  }, [pathname, shellRef])

  return (
    <div className="feature-shell rights-shell" ref={shellRef}>
      <FeatureHeader title={title} onQuickExit={onQuickExit} backTo={backTo} />
      <main className="rights-main">{children}</main>
    </div>
  )
}

function GovernmentBanner() {
  return (
    <a className="rights-gov-banner" href="https://www.gov.kr/portal/main/nologin" target="_blank" rel="noreferrer">
      <img src={`${ASSET_ROOT}/rights-government24-logo.png`} alt="" />
      <span><strong>정부24 바로가기 <ChevronRight size={14} /></strong><small>더 다양한 정부 서비스를 만나보세요!</small></span>
      <img className="rights-gov-building" src={`${ASSET_ROOT}/rights-government-building.png`} alt="" />
    </a>
  )
}

function CategoryTabs({ value, onChange, onGrid }) {
  return (
    <div className="rights-tabs" aria-label="서류 분류">
      {['전체 보기', '지원', '주거', '생활'].map((label) => (
        <button key={label} type="button" className={value === label ? 'active' : ''} onClick={() => onChange(label)}>{label}</button>
      ))}
      <button type="button" className="rights-grid-button" onClick={onGrid} aria-label="카드로 전체 보기"><Grid2X2 size={19} /></button>
    </div>
  )
}

function BookCard({ book, variant = 'shelf', onClick }) {
  return (
    <button type="button" className={`rights-book rights-book-${book.tone} rights-book-${variant}`} onClick={onClick}>
      <span className="rights-book-bookmark" />
      <strong>{book.shortTitle.split('\n').map((line) => <span key={line}>{line}</span>)}</strong>
      <span className="rights-book-hill" />
      <img src={`${ASSET_ROOT}/${book.icon}`} alt="" />
      {variant === 'grid' && <span className="rights-book-ledge" />}
    </button>
  )
}

export function RightsHomePage({ onQuickExit }) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('전체 보기')
  const filtered = useMemo(() => BOOKS.filter((book) => {
    const matchesQuery = book.title.includes(query.trim())
    const matchesCategory = category === '전체 보기' || book.category === category
    return matchesQuery && matchesCategory
  }), [category, query])

  return (
    <RightsShell onQuickExit={onQuickExit}>
      <label className="rights-search">
        <Search size={21} />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="필요한 혜택을 검색해보세요!" />
      </label>
      <CategoryTabs value={category} onChange={setCategory} onGrid={() => navigate('/rights/catalog')} />
      <section className="rights-bookshelf" aria-label="서류 책장">
        <img className="rights-bookshelf-bg" src={`${ASSET_ROOT}/rights-bookshelf.png`} alt="" />
        <div className="rights-shelf-grid">
          {filtered.map((book) => <BookCard key={book.id} book={book} onClick={() => navigate(`/rights/document/${book.id}`)} />)}
        </div>
        {filtered.length === 0 && <p className="rights-no-results">검색 결과가 없어요.</p>}
      </section>
      <div className="rights-pagination" aria-label="책장 페이지">
        <button type="button" disabled><ChevronLeft size={20} /></button><strong>1 / 3</strong><button type="button" onClick={() => navigate('/rights/catalog')}><ChevronRight size={20} /></button>
      </div>
      <GovernmentBanner />
      <button type="button" className="rights-secondary-cta" onClick={() => navigate('/rights/documents')}>
        <FolderOpen size={24} /> 내 서류함으로 이동하기 <ChevronRight size={18} />
      </button>
    </RightsShell>
  )
}

export function RightsCatalogPage({ onQuickExit }) {
  const navigate = useNavigate()
  const [category, setCategory] = useState('전체 보기')
  const visibleBooks = BOOKS.filter((book) => category === '전체 보기' || book.category === category).slice(0, 4)

  return (
    <RightsShell onQuickExit={onQuickExit} backTo="/rights">
      <section className="rights-featured">
        <span className="rights-pill">생활 · 필수 서류</span>
        <h1>주민등록등본·초본</h1>
        <p>내가 사는 곳과 누구와 살고 있는지 알려줘요. 조금은 더 추억의 소개해요.</p>
        <div className="rights-document-art" aria-hidden="true">
          <strong>주민등록등본</strong><span /><span /><span />
        </div>
        <img className="rights-sparkles" src={`${ASSET_ROOT}/rights-sparkles.png`} alt="" />
      </section>
      <CategoryTabs value={category} onChange={setCategory} onGrid={() => navigate('/rights')} />
      <div className="rights-catalog-grid">
        {visibleBooks.map((book) => <BookCard key={book.id} book={book} variant="grid" onClick={() => navigate(`/rights/document/${book.id}`)} />)}
      </div>
      <div className="rights-pagination" aria-label="책장 페이지">
        <button type="button" onClick={() => navigate('/rights')}><ChevronLeft size={20} /></button><strong>2 / 3</strong><button type="button" onClick={() => navigate('/rights/documents')}><ChevronRight size={20} /></button>
      </div>
      <GovernmentBanner />
      <button type="button" className="rights-secondary-cta" onClick={() => navigate('/rights/documents')}>
        <FolderOpen size={24} /> 내 서류함으로 이동하기 <ChevronRight size={18} />
      </button>
    </RightsShell>
  )
}

export function RightsDocumentsPage({ onQuickExit }) {
  const navigate = useNavigate()
  const [checked, setChecked] = useState(readChecklist)

  useEffect(() => {
    localStorage.setItem(CHECKLIST_KEY, JSON.stringify(checked))
  }, [checked])

  const toggle = (id) => setChecked((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
  const progress = Math.round((checked.length / PREP_ITEMS.length) * 100)

  return (
    <RightsShell title="내 서류함" onQuickExit={onQuickExit} backTo="/rights">
      <GovernmentBanner />
      <div className="rights-prep-tabs"><button className="active" type="button">집 구하기</button><button type="button">자립 준비</button><button type="button">학교</button></div>
      <aside className="rights-privacy-note"><span>!</span><div><strong>서류 원본 대신, 준비 상태만 체크해요</strong><small>체크 내용은 기기에만 저장해요. 주민번호나 계좌번호는 이곳에 입력하지 마세요.</small></div></aside>
      <section className="rights-prep-card">
        <small>집 구하기 · 나의 준비 목록</small>
        <h1>청년 월세 지원 신청</h1>
        <p>하나씩 준비하면 돼요. 벌써 {checked.length}개를 모았어요.</p>
        <div className="rights-progress-row"><strong>{checked.length} / {PREP_ITEMS.length} 준비</strong><b>{progress}%</b></div>
        <div className="rights-progress"><span style={{ width: `${progress}%` }} /></div>
        <div className="rights-prep-list">
          {PREP_ITEMS.map((item) => {
            const done = checked.includes(item.id)
            return (
              <button type="button" key={item.id} className={done ? 'done' : ''} onClick={() => toggle(item.id)}>
                <span className="rights-check">{done && <Check size={15} />}</span>
                <span><strong>{item.title}</strong><small>{item.detail}<br />발급일 · {item.meta}<br />유효 기준 · {item.rule}</small></span>
                <em>{done ? '준비완료' : '준비 전'}</em>
              </button>
            )
          })}
        </div>
      </section>
      <button type="button" className="rights-primary-cta" onClick={() => navigate('/rights/catalog')}>남은 서류, 사전에서 찾아보기</button>
    </RightsShell>
  )
}

export function RightsDetailPage({ onQuickExit }) {
  const navigate = useNavigate()
  const { documentId = 'resident' } = useParams()
  const detail = DOCUMENT_DETAILS[documentId] || DOCUMENT_DETAILS.resident
  const [prepared, setPrepared] = useState(() => readChecklist().includes(documentId))

  const togglePrepared = () => {
    const next = !prepared
    setPrepared(next)
    const current = readChecklist()
    const updated = next ? [...new Set([...current, documentId])] : current.filter((id) => id !== documentId)
    localStorage.setItem(CHECKLIST_KEY, JSON.stringify(updated))
  }

  return (
    <RightsShell onQuickExit={onQuickExit} backTo="/rights/catalog">
      <article className="rights-detail-card">
        <small>{detail.eyebrow}</small>
        <h1>{detail.title}</h1>
        <p className="rights-detail-summary">{detail.summary}</p>
        <section><h2>어디서 떼요?</h2><dl><div><dt>온라인</dt><dd><a href="https://www.gov.kr/portal/main/nologin" target="_blank" rel="noreferrer">정부24 <ExternalLink size={12} /></a><small>참고 예시 · 무료·즉시 / 공동·간편 인증</small></dd></div><div><dt>방문</dt><dd>가까운 주민센터<small>참고 예시 · 신분증 준비</small></dd></div><div><dt>무인발급기</dt><dd>설치 장소 확인<small>참고 예시 · 지문 인식</small></dd></div></dl></section>
        <section><h2>누가 뗄 수 있나요?</h2><p>본인 발급이 기본이에요. 대리 발급은 관계와 신청 방법에 따라 달라요.</p><small>대리인 신분증·위임장 등 필요한 서류를 주민센터에 먼저 확인해 주세요.</small></section>
        <section><h2>이럴 때 필요해요</h2><div className="rights-use-chips">{detail.uses.map((use) => <span key={use}>{use}</span>)}</div></section>
        <section><h2>떼기 전에 꼭 확인해요</h2><ul><li>발급 후 1~3개월 이내 서류를 요구하기도 해요.</li><li>표시 항목은 제출처가 요구한 범위만 선택해요.</li><li>필요한 서류 종류와 유효기간을 먼저 확인해요.</li></ul></section>
        <footer>출처 · 정부24 공식 발급 안내<br />확인 날짜 · 발급 전 최신 공식 안내 확인</footer>
      </article>
      <div className="rights-detail-pagination"><button type="button" onClick={() => navigate('/rights/catalog')}>‹ 이전 장</button><span><b />•••••••</span><button type="button" onClick={() => navigate('/rights/documents')}>다음 장 ›</button></div>
      <button type="button" className={`rights-prepared ${prepared ? 'active' : ''}`} onClick={togglePrepared}><span>{prepared && <Check size={16} />}</span><strong>내 서류함에 준비했어요</strong></button>
      <a className="rights-primary-cta" href="https://www.gov.kr/portal/main/nologin" target="_blank" rel="noreferrer">정부24에서 발급 정보 확인하기 <ExternalLink size={16} /></a>
    </RightsShell>
  )
}

