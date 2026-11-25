import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { ExternalLink } from 'lucide-react'
import { KYCI_DIRECTORY_URL, statusRegionName } from '../../shared/shelterStatus.js'
import { fetchShelterStatus } from '../api.js'
import FeatureHeader from '../components/FeatureHeader.jsx'

function RegionalStatus({ region }) {
  const [data, setData] = useState(null)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let active = true
    fetchShelterStatus(region).then((result) => {
      if (active) setData(result)
    }).catch(() => {
      if (active) setFailed(true)
    })
    return () => { active = false }
  }, [region, attempt])

  if (failed) return <div role="status"><p>공식 현황을 불러오지 못했어요. 방문 전에는 쉼터에 전화해 주세요.</p>
    <button className="help-secondary" onClick={() => { setFailed(false); setAttempt(attempt + 1) }}>다시 불러오기</button>
  </div>
  if (!data) return <p role="status">공식 현황을 불러오는 중이에요.</p>
  return <>
    <p className="admission-note">조회 시각 {new Date(data.checkedAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })} · 방문 전 입소 가능 여부를 전화로 확인해 주세요.</p>
    <ul className="shelter-status-list">
      {data.items.map((item) => (
        <li key={item.id}>
          <strong>{item.name}</strong>
          <span>정원 {item.capacity === null ? '미제공' : `${item.capacity}명`} · 현원 {item.residents === null ? '미제공' : `${item.residents}명`}</span>
          <b className={item.status === '입소가능' ? 'can-enter' : ''}>{item.status}</b>
        </li>
      ))}
    </ul>
  </>
}

export default function ShelterStatusPage({ onQuickExit }) {
  const { region } = useParams()
  const name = statusRegionName(region)
  return <div className="feature-shell legal-shell plain-back-arrow">
    <FeatureHeader title="쉼터 입소 현황" backTo="/shelters" onQuickExit={onQuickExit} />
    <main className="legal-main family-main shelter-status-page">
      <h1>{name || (region === 'sejong' ? '세종' : '지역별')} 청소년쉼터</h1>
      {name ? <RegionalStatus key={region} region={region} /> : <p>이 지역의 입소 현황은 공식 사이트에서 제공하지 않아요. 쉼터에 전화로 문의해 주세요.</p>}
      <a className="help-text-link" href={KYCI_DIRECTORY_URL}>한국청소년상담복지개발원 공식 현황 <ExternalLink size={15} aria-hidden="true" /></a>
    </main>
  </div>
}
