import { useState } from 'react'
import { ChevronRight, CircleAlert, Clock3, Phone, Sparkles, UserRoundCheck } from 'lucide-react'
import { MASCOTS } from '../constants.js'

export default function SupportPage({ supports, onSelect }) {
  const categories = ['전체', '주거', '생활', '일자리', '식사']
  const [category, setCategory] = useState('전체')
  const filtered = category === '전체' ? supports : supports.filter((item) => item.category === category)

  return (
    <div className="view support-view page-enter">
      <section className="support-hero">
        <div><span><Sparkles size={20} /> 맞춤 자립 지원</span><h1>혼자 준비하지<br />않아도 돼요</h1><p>주거, 생활비, 일자리, 식사 지원을 한곳에서 확인하세요.</p></div>
        <img className="mascot-float" src={MASCOTS.guide} alt="지원을 안내하는 가온" />
      </section>
      <a className="support-callout group transition duration-300 hover:-translate-y-1" href="tel:1388">
        <span><Phone size={22} /></span><div><strong>무엇부터 볼지 막막한가요?</strong><p>1388에서 필요한 지원을 함께 찾을 수 있어요.</p></div><ChevronRight className="transition group-hover:translate-x-1" size={20} />
      </a>
      <div className="category-scroll" role="tablist" aria-label="지원 분야">
        {categories.map((item) => <button role="tab" aria-selected={category === item} className={category === item ? 'active' : ''} key={item} onClick={() => setCategory(item)}>{item}</button>)}
      </div>
      <section className="support-list stagger-grid">
        <div className="results-heading"><strong>{category} 지원</strong><span>{filtered.length}개</span></div>
        {filtered.map((item) => (
          <button className="support-card group transition duration-300 hover:-translate-y-1" key={item.id} onClick={() => onSelect(item)}>
            <div className="support-card-head"><span className={`category-badge category-${item.category}`}>{item.category}</span><span className="deadline"><Clock3 size={14} /> {item.deadline}</span></div>
            <h2>{item.title}</h2><p>{item.body}</p>
            <div className="tag-row">{item.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
            <div className="support-card-foot"><span><UserRoundCheck size={15} /> {item.provider}</span><ChevronRight className="transition group-hover:translate-x-1" size={19} /></div>
          </button>
        ))}
      </section>
      <p className="data-note"><CircleAlert size={14} /> 신청 전 운영기관의 최신 공고를 확인해 주세요.</p>
    </div>
  )
}
