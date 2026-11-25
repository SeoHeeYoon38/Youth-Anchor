import { ChevronRight, House, Info } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'

export function ShelterVisitNote() {
  return <p className="shelter-visit-note"><Info size={16} aria-hidden="true" /> 방문 전 쉼터의 운영 여부와 현재 입소 가능 여부를 전화로 확인해 주세요.</p>
}

export function FamilyHelpCard() {
  const { pathname } = useLocation()
  return (
    <Link className="family-help-card" to="/family-help" state={{ from: pathname }}>
      <span className="help-icon rose"><House aria-hidden="true" /></span>
      <span>
        <strong>집에서 힘든 일을 겪고 있나요?</strong>
        <small>학대·방임이나 가족 갈등 등 상황에 맞는 도움과 상담기관을 확인해 보세요.</small>
      </span>
      <ChevronRight size={18} aria-hidden="true" />
    </Link>
  )
}
