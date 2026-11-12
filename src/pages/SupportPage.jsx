import { useState } from 'react'
import { ChevronRight, CircleAlert, Clock3, Search, Sparkles, UserRoundCheck, X } from 'lucide-react'

export default function SupportPage({ supports, onSelect }) {
  const categories = ['전체', '주거', '생활', '일자리', '식사']
  const [category, setCategory] = useState('전체')
  const [query, setQuery] = useState('')
  const normalizedQuery = query.trim().toLocaleLowerCase('ko-KR')
  const filtered = supports.filter((item) => {
    const inCategory = category === '전체' || item.category === category
    if (!inCategory || !normalizedQuery) return inCategory
    const searchable = [item.title, item.body, item.provider, item.category, ...(item.tags || [])].join(' ').toLocaleLowerCase('ko-KR')
    return searchable.includes(normalizedQuery)
  })

  return (
    <div className="view support-view page-enter">
      <section className="support-hero">
        <span className="support-kicker"><Sparkles size={13} /> 맞춤 자립 지원</span>
        <h1>혼자 준비하지<br />않아도 돼요</h1>
        <p>주거, 생활비, 일자리, 식사 지원을 한곳에서 확인하세요.</p>
        <a className="support-callout" href="tel:1388">
          <span className="support-callout-icon" aria-hidden="true"><img src="/figma/warm/heart.svg" alt="" /></span>
          <span className="support-callout-copy"><strong>1388에 바로 연결</strong><small>24시간 무료 청소년 상담</small></span>
          <ChevronRight size={17} aria-hidden="true" />
        </a>
      </section>
      <label className="support-search">
        <Search size={19} aria-hidden="true" />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="필요한 지원을 검색해 보세요" />
        {query && <button type="button" onClick={() => setQuery('')} aria-label="검색어 지우기"><X size={17} /></button>}
      </label>
      <div className="category-scroll" role="tablist" aria-label="지원 분야">
        {categories.map((item) => <button role="tab" aria-selected={category === item} className={category === item ? 'active' : ''} key={item} onClick={() => setCategory(item)}>{item}</button>)}
      </div>
      <section className="support-list stagger-grid">
        <div className="results-heading"><strong>{normalizedQuery ? '검색 결과' : `${category} 지원`}</strong><span>{filtered.length}개</span></div>
        {filtered.map((item) => (
          <button className="support-card" key={item.id} onClick={() => onSelect(item)}>
            <div className="support-card-head"><span className={`category-badge category-${item.category}`}>{item.category}</span><span className="deadline"><Clock3 size={14} /> {item.deadline}</span></div>
            <h2>{item.title}</h2><p>{item.body}</p>
            <div className="tag-row">{item.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
            <div className="support-card-foot"><span><UserRoundCheck size={15} /> {item.provider}</span><ChevronRight size={19} /></div>
          </button>
        ))}
        {filtered.length === 0 && <div className="empty-state"><Sparkles size={25} /><strong>{normalizedQuery ? '검색 결과가 없어요' : '등록된 지원 사업이 없어요'}</strong><p>{normalizedQuery ? '다른 검색어나 분야로 다시 찾아보세요.' : '새 공고가 수집되면 이곳에 표시돼요.'}</p></div>}
      </section>
      <p className="data-note"><CircleAlert size={14} /> 신청 전 운영기관의 최신 공고를 확인해 주세요.</p>
    </div>
  )
}
