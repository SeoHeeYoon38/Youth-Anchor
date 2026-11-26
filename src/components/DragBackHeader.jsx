import { useNavigate } from 'react-router-dom'
import usePullDown from '../usePullDown.js'

export default function DragBackHeader({ backTo, backState, className, children }) {
  const navigate = useNavigate()
  const header = usePullDown(() => {
    if (!backTo && window.history.state?.idx > 0) navigate(-1)
    else navigate(backTo || '/home', { state: backState })
  })
  return <header ref={header} className={`drag-back-header ${className}`}>{children}</header>
}
