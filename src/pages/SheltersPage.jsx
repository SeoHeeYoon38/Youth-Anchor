import { useMemo, useState } from 'react'
import { ChevronRight, LocateFixed, MapPin, SlidersHorizontal, X } from 'lucide-react'
import KakaoMap from '../components/KakaoMap.jsx'
import DragBackHeader from '../components/DragBackHeader.jsx'
import ShelterCard from '../components/ShelterCard.jsx'
import { ShelterVisitNote } from '../components/ShelterHelp.jsx'
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
  const locationCopy = locationMessage || '위치 권한 없이도 쉼터를 확인할 수 있어요'
  const highlightedLocationCopy = locationCopy.split(/(서울시청|쉼터)/g).filter(Boolean)

  return (
    <>
      <div className="view shelter-view page-enter">
        <DragBackHeader className="map-header">
          <div><span>HAVEN</span><h1>청소년쉼터 지도</h1></div>
        </DragBackHeader>

        <div className={`map-search${searchQuery ? ' has-query' : ''}`}>
          <img src="/figma/warm/map-search.svg" alt="" aria-hidden="true" />
          <span className="map-search-copy" aria-hidden="true">
            {highlightedLocationCopy.map((segment, index) => (
              segment === '서울시청' || segment === '쉼터'
                ? <strong key={`${segment}-${index}`}>{segment}</strong>
                : <span key={`${segment}-${index}`}>{segment}</span>
            ))}
          </span>
          <input
            type="text"
            placeholder="쉼터 이름 또는 주소 검색"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="쉼터 이름 또는 주소 검색"
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
            <SlidersHorizontal size={14} /><span>조건{isFilterActive(filter) ? ` · ${describeFilter(filter)}` : ''}</span>
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

        {viewMode === 'map' ? (
          <KakaoMap position={position} shelters={visibleShelters} searching={Boolean(searchQuery.trim())} onSelectShelter={onSelectShelter} />
        ) : (
          <div className="shelter-list page-enter">
            {visibleShelters.map((shelter) => <ShelterCard key={shelter.id} shelter={shelter} onClick={() => onSelectShelter(shelter)} />)}
          </div>
        )}

        {visibleShelters.length === 0 && (
          <div className="empty-state">
            <MapPin size={25} />
            <strong>조건에 맞는 쉼터가 없어요</strong>
            <p>{filterActive ? '조건을 바꾸거나 검색어를 초기화해 보세요.' : '잠시 후 다시 확인해 주세요.'}</p>
          </div>
        )}

        {viewMode === 'map' && visibleShelters.length > 0 && (
          <section className="map-results reveal-card">
            <div className="results-heading"><strong>가까운 쉼터</strong><span>{visibleShelters.length}곳</span></div>
            {visibleShelters.slice(0, 3).map((shelter) => (
              <button className="result-row group" key={shelter.id} onClick={() => onSelectShelter(shelter)}>
                <img className="result-icon transition group-hover:scale-110" src="/icons/help/shelter-house.svg" alt="" />
                <span className="result-copy"><strong>{shelter.name}</strong><small>{formatDistance(shelter.distance)} · {shelter.type} · {shelter.gender}</small></span>
                <ChevronRight className="result-chevron" size={18} />
              </button>
            ))}
          </section>
        )}
        <p className="data-note"><span aria-hidden="true">•</span> 위치는 가까운 순서를 계산할 때만 사용해요</p>
        <ShelterVisitNote />
      </div>
    </>
  )
}
