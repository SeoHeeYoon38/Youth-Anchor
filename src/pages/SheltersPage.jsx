import { useMemo, useState } from 'react'
import { Check, ChevronLeft, ChevronRight, House, LocateFixed, MapPin, Search, ShieldCheck, SlidersHorizontal } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import KakaoMap from '../components/KakaoMap.jsx'
import ShelterCard from '../components/ShelterCard.jsx'
import ShelterOnboarding from '../components/ShelterOnboarding.jsx'
import { formatDistance } from '../utils.js'

export default function SheltersPage({ shelters, position, locationMessage, locateMe, locating, onSelectShelter }) {
  const navigate = useNavigate()
  const [viewMode, setViewMode] = useState('map')
  const [filterOpen, setFilterOpen] = useState(false)
  const [filter, setFilter] = useState('전체')

  const visibleShelters = useMemo(() => {
    if (filter === '전체') return shelters
    if (filter === '이동쉼터') return shelters.filter((shelter) => shelter.type === '이동쉼터')
    return shelters.filter((shelter) => shelter.gender === filter || shelter.gender === '누구나')
  }, [filter, shelters])

  return (
    <div className="view shelter-view page-enter">
      <header className="map-header">
        <button className="round-button transition hover:-translate-x-0.5" onClick={() => navigate('/home')} aria-label="홈으로 돌아가기"><ChevronLeft size={24} /></button>
        <div><span>HAVEN</span><h1>SOS 대피처</h1></div>
        <button className="round-button transition hover:scale-105" onClick={() => setViewMode(viewMode === 'map' ? 'list' : 'map')} aria-label="지도와 목록 전환"><Search size={22} /></button>
      </header>

      <div className="map-search"><Search size={19} /><span>{locationMessage}</span></div>

      <div className="map-controls">
        <div className="segmented-control" aria-label="보기 방식">
          <button className={viewMode === 'map' ? 'active' : ''} onClick={() => setViewMode('map')}>지도</button>
          <button className={viewMode === 'list' ? 'active' : ''} onClick={() => setViewMode('list')}>목록</button>
        </div>
        <button className={filterOpen ? 'filter-button active' : 'filter-button'} onClick={() => setFilterOpen((open) => !open)} aria-expanded={filterOpen}>
          <SlidersHorizontal size={17} /> 조건
        </button>
        <button className="filter-button" onClick={locateMe} disabled={locating}><LocateFixed size={17} className={locating ? 'spin' : ''} /> 내 위치</button>
      </div>

      {filterOpen && (
        <div className="filter-row page-enter" aria-label="대피처 이용 조건">
          {['전체', '누구나', '여성', '남성', '이동쉼터'].map((item) => (
            <button key={item} className={filter === item ? 'active' : ''} onClick={() => setFilter(item)}>
              {filter === item && <Check size={14} />} {item}
            </button>
          ))}
        </div>
      )}

      <ShelterOnboarding onOpenChat={() => navigate('/chat')} />

      {viewMode === 'map' ? (
        <KakaoMap position={position} shelters={visibleShelters} onSelectShelter={onSelectShelter} onOpenChat={() => navigate('/chat')} />
      ) : (
        <div className="shelter-list page-enter">
          {visibleShelters.map((shelter) => <ShelterCard key={shelter.id} shelter={shelter} onClick={() => onSelectShelter(shelter)} />)}
        </div>
      )}

      {visibleShelters.length === 0 && <div className="empty-state"><MapPin size={25} /><strong>조건에 맞는 대피처가 없어요</strong><p>다른 조건을 선택해 주세요.</p></div>}

      {viewMode === 'map' && visibleShelters.length > 0 && (
        <section className="map-results reveal-card">
          <div className="results-heading"><strong>가까운 대피처</strong><span>{visibleShelters.length}곳</span></div>
          {visibleShelters.slice(0, 3).map((shelter) => (
            <button className="result-row group" key={shelter.id} onClick={() => onSelectShelter(shelter)}>
              <span className="result-icon transition group-hover:scale-110"><House size={21} /></span>
              <span className="result-copy"><strong>{shelter.name}</strong><small>{formatDistance(shelter.distance)} · {shelter.open}</small></span>
              <span className="result-arrow"><ChevronRight size={16} /></span>
            </button>
          ))}
        </section>
      )}
      <p className="data-note"><ShieldCheck size={14} /> 위치는 가까운 순서를 계산할 때만 사용해요.</p>
    </div>
  )
}
