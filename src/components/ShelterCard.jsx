import { ChevronRight } from 'lucide-react'
import { formatDistance } from '../utils.js'

export default function ShelterCard({ shelter, onClick }) {
  const warning = shelter.status === '마감 임박'
  return (
    <button className="shelter-card transition duration-300 hover:-translate-y-1" onClick={onClick}>
      <div className="shelter-card-top">
        <span className={`status-pill ${warning ? 'warning' : ''}`}><i /> {shelter.status}</span>
        <span>{formatDistance(shelter.distance)}</span>
      </div>
      <strong>{shelter.name}</strong>
      <small>{shelter.type} · {shelter.gender} · {shelter.open}</small>
      <div className="tag-row">{shelter.features.slice(0, 3).map((feature) => <span key={feature}>{feature}</span>)}</div>
      <div className="availability">
        <span>{shelter.beds > 0 ? <><b>{shelter.beds}자리</b> 남았어요</> : <b>현재 운영 중</b>}</span>
        <ChevronRight size={18} />
      </div>
    </button>
  )
}
