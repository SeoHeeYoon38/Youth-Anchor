import { useMemo, useState } from 'react'
import { Check, ChevronLeft, ChevronRight, House, LocateFixed, MapPin, RotateCcw, Search, ShieldCheck, SlidersHorizontal, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import KakaoMap from '../components/KakaoMap.jsx'
import ShelterCard from '../components/ShelterCard.jsx'
import {
  DEFAULT_SHELTER_FILTER,
  SHELTER_AUDIENCE_FILTERS,
  SHELTER_TYPE_FILTERS,
  describeFilter,
  filterShelters,
  isFilterActive
} from '../shelterFilters.js'
import { formatDistance } from '../utils.js'

export default function SheltersPage({ shelters, position, locationMessage, locateMe, locating, onSelectShelter }) {
  const navigate = useNavigate()
  const [viewMode, setViewMode] = useState('map')
  const [filterOpen, setFilterOpen] = useState(false)
  const [filter, setFilter] = useState(DEFAULT_SHELTER_FILTER)
  const [searchQuery, setSearchQuery] = useState('')

  const visibleShelters = useMemo(() => {
    const filtered = filterShelters(shelters, filter)
    if (!searchQuery.trim()) return filtered
    
    const query = searchQuery.toLowerCase()
    return filtered.filter((shelter) => 
      shelter.name?.toLowerCase().includes(query) || 
      shelter.address?.toLowerCase().includes(query)
    )
  }, [filter, shelters, searchQuery])

  const filterActive = isFilterActive(filter) || searchQuery.trim() !== ''

  const handleResetFilters = () => {
    setFilter(DEFAULT_SHELTER_FILTER)
    setSearchQuery('')
  }

  return (
    <>
      <div className="view shelter-view page-enter">
        <header className="map-header">
          <button className="round-button transition hover:-translate-x-0.5" onClick={() => navigate('/home')} aria-label="홈으로 돌아가기"><ChevronLeft size={24} /></button>
          <div><span>HAVEN</span><h1>SOS 대피처</h1></div>
          <button className="round-button transition hover:scale-105" onClick={() => setViewMode(viewMode === 'map' ? 'list' : 'map')} aria-label="지도와 목록 전환"><Search size={22} /></button>
        </header>

        <div className="map-search">
          <Search size={19} />
          <input
            type="text"
            placeholder={`${locationMessage || '대피처 이름 또는 주소 검색...'}`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              width: '100%',
              marginLeft: '8px',
              fontSize: '14px',
              color: 'inherit'
            }}
            aria-label="대피처 이름 또는 주소 검색"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')} 
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', color: 'inherit' }}
              aria-label="검색어 지우기"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <div className="map-controls">
          <div className="segmented-control" aria-label="보기 방식">
            <button className={viewMode === 'map' ? 'active' : ''} onClick={() => setViewMode('map')}>지도</button>
            <button className={viewMode === 'list' ? 'active' : ''} onClick={() => setViewMode('list')}>목록</button>
          </div>
          <button className={filterOpen || isFilterActive(filter) ? 'filter-button active' : 'filter-button'} onClick={() => setFilterOpen((open) => !open)} aria-expanded={filterOpen}>
            <SlidersHorizontal size={17} /> 조건{isFilterActive(filter) ? ` · ${describeFilter(filter)}` : ''}
          </button>
          <button className="filter-button" onClick={locateMe} disabled={locating}><LocateFixed size={17} className={locating ? 'spin' : ''} /> 내 위치</button>
        </div>

        {filterOpen && (
          <div className="filter-panel page-enter">
            <div className="filter-group">
              <span className="filter-group-label">머물 수 있는 기간</span>
              <div className="filter-row" role="group" aria-label="쉼터 유형">
                {SHELTER_TYPE_FILTERS.map((item) => (
                  <button
                    key={item}
                    className={filter.type === item ? 'active' : ''}
                    aria-pressed={filter.type === item}
                    onClick={() => setFilter((current) => ({ ...current, type: item }))}
                  >
                    {filter.type === item && <Check size={14} />} {item}
                  </button>
                ))}
              </div>
            </div>
            <div className="filter-group">
              <span className="filter-group-label">이용 대상</span>
              <div className="filter-row" role="group" aria-label="이용 대상">
                {SHELTER_AUDIENCE_FILTERS.map((item) => (
                  <button
                    key={item}
                    className={filter.audience === item ? 'active' : ''}
                    aria-pressed={filter.audience === item}
                    onClick={() => setFilter((current) => ({ ...current, audience: item }))}
                  >
                    {filter.audience === item && <Check size={14} />} {item}
                  </button>
                ))}
              </div>
            </div>
            <div className="filter-footer">
              <span>{visibleShelters.length}곳 표시 중</span>
              {filterActive && (
                <button className="filter-reset" onClick={handleResetFilters}>
                  <RotateCcw size={14} /> 조건 초기화
                </button>
              )}
            </div>
          </div>
        )}

        {viewMode === 'map' ? (
          <KakaoMap position={position} shelters={visibleShelters} onSelectShelter={onSelectShelter} />
        ) : (
          <div className="shelter-list page-enter">
            {visibleShelters.map((shelter) => <ShelterCard key={shelter.id} shelter={shelter} onClick={() => onSelectShelter(shelter)} />)}
          </div>
        )}

        {visibleShelters.length === 0 && (
          <div className="empty-state">
            <MapPin size={25} />
            <strong>조건에 맞는 대피처가 없어요</strong>
            <p>{filterActive ? '조건을 바꾸거나 검색어를 초기화해 보세요.' : '잠시 후 다시 확인해 주세요.'}</p>
            {filterActive && (
              <button className="filter-reset" onClick={handleResetFilters}>
                <RotateCcw size={14} /> 조건 초기화
              </button>
            )}
          </div>
        )}

        {viewMode === 'map' && visibleShelters.length > 0 && (
          <section className="map-results reveal-card">
            <div className="results-heading"><strong>가까운 대피처</strong><span>{visibleShelters.length}곳</span></div>
            {visibleShelters.slice(0, 3).map((shelter) => (
              <button className="result-row group" key={shelter.id} onClick={() => onSelectShelter(shelter)}>
                <span className="result-icon transition group-hover:scale-110"><House size={21} /></span>
                <span className="result-copy"><strong>{shelter.name}</strong><small>{formatDistance(shelter.distance)} · {shelter.type} · {shelter.gender}</small></span>
                <ChevronRight className="result-chevron" size={18} />
              </button>
            ))}
          </section>
        )}
        <p className="data-note"><ShieldCheck size={14} /> 위치는 가까운 순서를 계산할 때만 사용해요.</p>
      </div>
    </>
  )
}
