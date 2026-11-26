import { ArrowLeft, Power } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import DragBackHeader from './DragBackHeader.jsx'

export default function FeatureHeader({ title, onQuickExit, backTo = '/home', backState, showBack = true, children }) {
  const navigate = useNavigate()

  return (
    <DragBackHeader className="feature-header" backTo={backTo} backState={backState}>
      <div className="feature-header-title">
        {showBack && <button type="button" className="feature-back" onClick={() => navigate(backTo, { state: backState })} aria-label="이전 화면">
          <ArrowLeft size={20} />
        </button>}
        <strong>{title}</strong>
      </div>
      <div className="feature-header-actions">
        {children}
        <button type="button" className="feature-exit" onClick={onQuickExit}>
          <Power size={16} /> 긴급종료
        </button>
      </div>
    </DragBackHeader>
  )
}
