import { ChevronRight } from 'lucide-react'
import { formatDistance } from '../utils.js'

export default function ShelterCard({ shelter, onClick }) {
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
