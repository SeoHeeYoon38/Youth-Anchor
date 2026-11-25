import { X } from 'lucide-react'
import { useState } from 'react'

export default function JobSearchFab() {
  const [visible, setVisible] = useState(true)
  if (!visible) return null
  return (
    <aside className="job-fab" aria-label="가온의 일자리 안내">
      <a className="job-fab-link" href="https://www.work24.go.kr/wk/a/b/1200/retriveDtlEmpSrchList.do" target="_blank" rel="noreferrer">
        <strong className="job-fab-bubble">일자리를 찾아봐요</strong>
        <span className="mascot-breathe" aria-hidden="true"><img className="job-fab-mascot" src="/figma/warm/welcome-mascot.png" alt="" /></span>
      </a>
      <button type="button" className="job-fab-close" onClick={() => setVisible(false)} aria-label="일자리 찾기 닫기"><X size={12} /></button>
    </aside>
  )
}
