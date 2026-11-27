import { X } from 'lucide-react'
import { useRef, useState } from 'react'

let lastPosition = { x: 1, y: 1 }
const fraction = (offset, space) => space > 0 ? Math.min(1, Math.max(0, offset / space)) : 0

export default function JobSearchFab() {
  const [visible, setVisible] = useState(true)
  const [position, setPosition] = useState(lastPosition)
  const boundsRef = useRef(null)
  const drag = useRef(null)
  const suppressClick = useRef(false)

  function startDrag(event) {
    if (!event.isPrimary || event.button !== 0) return
    const rect = event.currentTarget.getBoundingClientRect()
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, dx: event.clientX - rect.left, dy: event.clientY - rect.top }
    suppressClick.current = false
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function moveDrag(event) {
    const start = drag.current
    if (!start || start.id !== event.pointerId) return
    if (!suppressClick.current && Math.hypot(event.clientX - start.x, event.clientY - start.y) < 7) return
    suppressClick.current = true
    const bounds = boundsRef.current.getBoundingClientRect()
    const rect = event.currentTarget.getBoundingClientRect()
    lastPosition = {
      x: fraction(event.clientX - bounds.left - start.dx, bounds.width - rect.width),
      y: fraction(event.clientY - bounds.top - start.dy, bounds.height - rect.height),
    }
    setPosition(lastPosition)
  }

  function endDrag(event) {
    if (drag.current?.id === event.pointerId) drag.current = null
  }

  if (!visible) return null
  return (
    <div className="job-fab-area" ref={boundsRef}>
      <aside className="job-fab" aria-label="가온의 일자리 안내" style={{ '--fab-x': `${position.x * 100}%`, '--fab-y': `${position.y * 100}%` }}>
        <a
          className="job-fab-link"
          href="https://www.work24.go.kr/wk/a/b/1200/retriveDtlEmpSrchList.do"
          target="_blank"
          rel="noreferrer"
          draggable={false}
          onPointerDown={startDrag}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onLostPointerCapture={endDrag}
          onClick={(event) => { if (event.detail && suppressClick.current) event.preventDefault() }}
        >
          <strong className="job-fab-bubble">일자리를 찾아봐요</strong>
          <span className="mascot-breathe" aria-hidden="true"><img className="job-fab-mascot" src="/figma/warm/welcome-mascot.png" alt="" /></span>
        </a>
        <button type="button" className="job-fab-close" onClick={() => setVisible(false)} aria-label="일자리 찾기 닫기"><X size={12} /></button>
      </aside>
    </div>
  )
}
