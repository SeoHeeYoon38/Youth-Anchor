import { ChevronRight } from 'lucide-react'
import { formatDistance } from '../utils.js'

export default function ShelterCard({ shelter, onClick, variant = 'default' }) {
  if (variant === 'warm') {
    const details = [shelter.type, ...shelter.features.slice(0, 2)].filter(Boolean)

    return (
      <button className="shelter-card shelter-card-warm transition duration-300" onClick={onClick}>
        <span className="warm-shelter-icon" aria-hidden="true"><img src="/figma/warm/shelter-card.svg" alt="" /></span>
        <span className="warm-shelter-copy">
          <strong>{shelter.name}</strong>
          <small>{details.map((detail) => `#${detail}`).join(' ')}</small>
        </span>
        <span className="warm-shelter-more">정보 확인하기 &gt;</span>
      </button>
    )
  }

  return (
    <button className="shelter-card transition duration-300 hover:-translate-y-1" onClick={onClick}>
      <div className="shelter-card-top">
        <span className="shelter-type-label">{shelter.type}</span>
        <span>{formatDistance(shelter.distance)}</span>
      </div>
      <strong>{shelter.name}</strong>
      <small>{shelter.type} · {shelter.gender} · {shelter.open}</small>
      <div className="tag-row">{shelter.features.slice(0, 3).map((feature) => <span key={feature}>{feature}</span>)}</div>
      <div className="availability">
        <span><b>이용 정보 확인하기</b></span>
        <ChevronRight size={18} />
      </div>
    </button>
  )
}
