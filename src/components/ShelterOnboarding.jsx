import { ChevronRight, MessageCircle, ShieldCheck } from 'lucide-react'
import Mascot from './Mascot.jsx'

export default function ShelterOnboarding({ onOpenChat }) {
  return (
    <aside className="shelter-onboarding" aria-label="대피처 이용 안내">
      <Mascot pose="guide" alt="대피처 찾기를 안내하는 가온" />
      <div className="shelter-onboarding-copy">
        <span><ShieldCheck size={13} /> 처음이라면 가온에게 물어봐요</span>
        <strong>필요한 곳을 같이 찾아드릴게요.</strong>
        <small>쉼터를 누르면 이용 대상과 운영 시간을 확인할 수 있어요.</small>
      </div>
      <button className="shelter-onboarding-action" type="button" onClick={onOpenChat} aria-label="가온에게 대피처 찾기 도움받기">
        <MessageCircle size={17} />
        <ChevronRight size={16} />
      </button>
    </aside>
  )
}
