import { useMemo, useState } from 'react'
import { ChevronRight, House, LocateFixed, MapPin, SlidersHorizontal, X } from 'lucide-react'
import KakaoMap from '../components/KakaoMap.jsx'
import ShelterCard from '../components/ShelterCard.jsx'
import {
  DEFAULT_SHELTER_FILTER,
  SHELTER_AUDIENCE_FILTERS,
  SHELTER_TYPE_FILTERS,
  describeFilter,
  filterShelters,
  isFilterActive,
  searchShelters
} from '../shelterFilters.js'
import { formatDistance } from '../utils.js'

export default function SheltersPage({ shelters, position, locationMessage, locateMe, locating, onSelectShelter }) {
  const [viewMode, setViewMode] = useState('map')
  const [viewTouched, setViewTouched] = useState(false)
  const [filterOpen, setFilterOpen] = useState(true)
  const [filterTouched, setFilterTouched] = useState(false)
  const [filter, setFilter] = useState(DEFAULT_SHELTER_FILTER)
  const [searchQuery, setSearchQuery] = useState('')

  const visibleShelters = useMemo(() => {
    const filtered = filterShelters(shelters, filter)
    return searchShelters(filtered, searchQuery)
  }, [filter, shelters, searchQuery])

  const filterActive = isFilterActive(filter) || searchQuery.trim() !== ''
  const locationCopy = locationMessage || '위치 권한 없이도 대피처를 확인할 수 있어요'
  const highlightedLocationCopy = locationCopy.split(/(서울시청|대피처)/g).filter(Boolean)

  return (
    <>
      <div className="view shelter-view page-enter">
        <header className="map-header">
          <div><span>HAVEN</span><h1>SOS 대피처</h1></div>
        </header>

        <div className={`map-search${searchQuery ? ' has-query' : ''}`}>
          <img src="/figma/warm/map-search.svg" alt="" aria-hidden="true" />
          <span className="map-search-copy" aria-hidden="true">
            {highlightedLocationCopy.map((segment, index) => (
              segment === '서울시청' || segment === '대피처'
                ? <strong key={`${segment}-${index}`}>{segment}</strong>
                : <span key={`${segment}-${index}`}>{segment}</span>
            ))}
          </span>
          <input
            type="text"
            placeholder="대피처 이름 또는 주소 검색"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="대피처 이름 또는 주소 검색"
          />
          {searchQuery && (
            <button
              className="map-search-clear"
              onClick={() => setSearchQuery('')}
              aria-label="검색어 지우기"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <div className="map-controls">
          <div className="segmented-control" aria-label="보기 방식">
            <button className={viewTouched && viewMode === 'map' ? 'active' : ''} onClick={() => { setViewMode('map'); setViewTouched(true) }}>지도</button>
            <button className={viewTouched && viewMode === 'list' ? 'active' : ''} onClick={() => { setViewMode('list'); setViewTouched(true) }}>목록</button>
          </div>
          <button className={(isFilterActive(filter) || (filterTouched && filterOpen)) ? 'filter-button condition-button active' : 'filter-button condition-button'} onClick={() => { setFilterOpen((open) => !open); setFilterTouched(true) }} aria-expanded={filterOpen}>
            <SlidersHorizontal size={14} /> 조건{isFilterActive(filter) ? ` · ${describeFilter(filter)}` : ''}
          </button>
          <button className={locating || position ? 'filter-button active' : 'filter-button'} onClick={locateMe} disabled={locating} aria-pressed={Boolean(position)}>
            <LocateFixed size={14} className={locating ? 'spin' : ''} /> 내 위치
          </button>
        </div>

        {filterOpen && (
          <div className="filter-panel page-enter">
            <div className="filter-group">
              <span className="filter-group-label">이용 대상</span>
              <div className="filter-row" role="group" aria-label="이용 대상">
                {SHELTER_AUDIENCE_FILTERS.map((item) => (
                  <button
                    key={item}
                    className={filter.audience === item ? 'active' : ''}
                    aria-pressed={filter.audience === item}
                    onClick={() => setFilter((current) => ({
                      ...current,
                      audience: current.audience === item ? '전체' : item
                    }))}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
            <div className="filter-group">
              <span className="filter-group-label">머물 수 있는 기간</span>
              <div className="filter-row" role="group" aria-label="쉼터 유형">
                {SHELTER_TYPE_FILTERS.map((item) => (
                  <button
                    key={item}
                    className={filter.type === item ? 'active' : ''}
                    aria-pressed={filter.type === item}
                    onClick={() => setFilter((current) => ({
                      ...current,
                      type: current.type === item ? '전체' : item
                    }))}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <button className="map-intro-card" onClick={() => setViewMode('map')}>
          <span className="map-intro-icon" aria-hidden="true"><img src="/figma/warm/map-intro.svg" alt="" /></span>
          <span><strong>가까운 대피처를 찾아보세요</strong><small>방문 전 운영 여부와 이용 가능 인원을 확인한 뒤 갈 수 있는 대피처를 찾아보세요.</small></span>
        </button>

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
        <p className="data-note"><span aria-hidden="true">•</span> 위치는 가까운 순서를 계산할 때만 사용해요</p>
      </div>
    </>
  )
}
