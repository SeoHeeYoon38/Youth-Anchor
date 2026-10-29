import { useState } from 'react'
import { ChevronRight, CircleAlert, Clock3, Sparkles, UserRoundCheck } from 'lucide-react'

export default function SupportPage({ supports, onSelect }) {
  const categories = ['전체', '주거', '생활', '일자리', '식사']
  const [category, setCategory] = useState('전체')
  const filtered = category === '전체' ? supports : supports.filter((item) => item.category === category)

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
      <div className="category-scroll" role="tablist" aria-label="지원 분야">
        {categories.map((item) => <button role="tab" aria-selected={category === item} className={category === item ? 'active' : ''} key={item} onClick={() => setCategory(item)}>{item}</button>)}
      </div>
      <section className="support-list stagger-grid">
        <div className="results-heading"><strong>{category} 지원</strong><span>{filtered.length}개</span></div>
        {filtered.map((item) => (
          <button className="support-card" key={item.id} onClick={() => onSelect(item)}>
            <div className="support-card-head"><span className={`category-badge category-${item.category}`}>{item.category}</span><span className="deadline"><Clock3 size={14} /> {item.deadline}</span></div>
            <h2>{item.title}</h2><p>{item.body}</p>
            <div className="tag-row">{item.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
            <div className="support-card-foot"><span><UserRoundCheck size={15} /> {item.provider}</span><ChevronRight size={19} /></div>
          </button>
        ))}
        {filtered.length === 0 && <div className="empty-state"><Sparkles size={25} /><strong>등록된 지원 사업이 없어요</strong><p>새 공고가 수집되면 이곳에 표시돼요.</p></div>}
      </section>
      <p className="data-note"><CircleAlert size={14} /> 신청 전 운영기관의 최신 공고를 확인해 주세요.</p>
    </div>
  )
}
