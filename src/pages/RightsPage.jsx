import { Check, ChevronLeft, ChevronRight, ExternalLink, FolderOpen, FolderPlus, Plus, Search, Trash2, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { fetchRightsDocuments, fetchUserData, recommendRightsCollection, saveUserData } from '../api.js'
import FeatureHeader from '../components/FeatureHeader.jsx'
import BottomNav from '../components/BottomNav.jsx'
import ChatFab from '../components/ChatFab.jsx'
import { RIGHTS_DOCUMENTS, RIGHTS_DOCUMENT_DETAILS } from '../../shared/rightsCatalog.js'

const ASSET_ROOT = '/figma/features'
const SAVED_DOCUMENTS_KEY = 'haven-rights-saved-documents'
const COLLECTIONS_KEY = 'haven-rights-collections'
const CATEGORIES = ['전체', '지원', '주거', '생활', '일자리']

const BOOKS = RIGHTS_DOCUMENTS
const DOCUMENT_DETAILS = RIGHTS_DOCUMENT_DETAILS

const PREP_METADATA = {
  resident: { detail: '주소 · 세대 정보', meta: '2026.11.01', rule: '제출처 기준 확인' },
  family: { detail: '가족 관계 확인', meta: '2026.11.01', rule: '상세·일반 여부 확인' },
  bank: { detail: '본인 명의 · 지원금 수령 계좌', meta: '2026.11.02', rule: '계좌 정보 확인' },
  lease: { detail: '계약자·주소·임대료 확인', meta: '아직 준비 전', rule: '계약 내용 확인' },
  income: { detail: '소득 증빙 · 공고 기준 확인', meta: '아직 준비 전', rule: '증명 대상 연도 확인' },
  employment: { detail: '근무 조건 · 계약 기간 확인', meta: '아직 준비 전', rule: '서명·날인 확인' },
  career: { detail: '근무 이력 · 담당 업무 확인', meta: '아직 준비 전', rule: '제출처 양식 확인' }
}

const DEFAULT_SAVED_DOCUMENT_IDS = ['resident', 'family', 'basic', 'health', 'income', 'protection']
const DEFAULT_COLLECTIONS = [{ id: 'monthly-rent', title: '청년 월세 지원', category: '주거', documentIds: ['resident', 'family', 'bank', 'lease', 'income'], checkedDocumentIds: ['resident', 'family', 'bank'] }]

function readStoredArray(key, fallback) {
  try {
    const saved = JSON.parse(localStorage.getItem(key) || 'null')
    return Array.isArray(saved) ? saved : fallback
  } catch {
    return fallback
  }
}

function readSavedDocumentIds() { return readStoredArray(SAVED_DOCUMENTS_KEY, DEFAULT_SAVED_DOCUMENT_IDS) }
function readCollections() {
  return readStoredArray(COLLECTIONS_KEY, DEFAULT_COLLECTIONS).map((collection) => ({
    ...collection,
    documentIds: Array.isArray(collection.documentIds) ? collection.documentIds : [],
    checkedDocumentIds: Array.isArray(collection.checkedDocumentIds) ? collection.checkedDocumentIds : []
  }))
}

function useRightsCatalog() {
  const [books, setBooks] = useState(BOOKS)
  useEffect(() => {
    let active = true
    fetchRightsDocuments().then((items) => {
      if (active && items.length) setBooks(items)
    }).catch(() => {})
    return () => { active = false }
  }, [])
  return books
}

function useRightsLibrary() {
  const [savedDocumentIds, setSavedDocumentIds] = useState(readSavedDocumentIds)
  const [collections, setCollections] = useState(readCollections)
  const hydratedRef = useRef(false)

  useEffect(() => {
    let active = true
    fetchUserData('rights-library').then((saved) => {
      if (!active) return
      const remote = saved.data && typeof saved.data === 'object' ? saved.data : {}
      if (saved.updatedAt) {
        if (Array.isArray(remote.savedDocumentIds)) setSavedDocumentIds(remote.savedDocumentIds)
        if (Array.isArray(remote.collections)) {
          setCollections(remote.collections.map((collection) => ({
            ...collection,
            documentIds: Array.isArray(collection.documentIds) ? collection.documentIds : [],
            checkedDocumentIds: Array.isArray(collection.checkedDocumentIds) ? collection.checkedDocumentIds : []
          })))
        }
      }
      hydratedRef.current = true
    }).catch(() => { hydratedRef.current = true })
    return () => { active = false }
  }, [])

  useEffect(() => {
    localStorage.setItem(SAVED_DOCUMENTS_KEY, JSON.stringify(savedDocumentIds))
    localStorage.setItem(COLLECTIONS_KEY, JSON.stringify(collections))
    if (hydratedRef.current) saveUserData('rights-library', { savedDocumentIds, collections }).catch(() => {})
  }, [collections, savedDocumentIds])

  return { savedDocumentIds, setSavedDocumentIds, collections, setCollections }
}

function fallbackCollectionSuggestion(title) {
  const normalized = title.replace(/\s/g, '')
  if (/월세|주거|집|임대|전세/.test(normalized)) return { category: '주거', documentIds: ['resident', 'family', 'bank', 'lease', 'income'] }
  if (/취업|일자리|근로|회사/.test(normalized)) return { category: '일자리', documentIds: ['resident', 'employment', 'career', 'bank'] }
  if (/학교|장학|학업|입학/.test(normalized)) return { category: '생활', documentIds: ['resident', 'family', 'enrollment', 'graduation', 'income'] }
  if (/자립|지원|생활비|복지/.test(normalized)) return { category: '지원', documentIds: ['resident', 'family', 'bank', 'income', 'protection'] }
  return { category: '생활', documentIds: ['resident', 'family', 'basic'] }
}

function toneForCategory(category) { return { 지원: 'health', 주거: 'resident', 생활: 'family', 일자리: 'income' }[category] || 'basic' }
function prepMetadataFor(book) { return PREP_METADATA[book.id] || { detail: `${book.category} 신청에 필요한 확인 서류`, meta: '아직 준비 전', rule: '최신 발급 기준 확인' } }

function RightsShell({ title = '서류사전', onQuickExit, backTo = '/home', pageClass = '', showBack = false, children }) {
  const { pathname } = useLocation()
  const shellRef = useRef(null)
  const displayBack = showBack || pageClass.includes('rights-detail-page')
  useEffect(() => { shellRef.current?.scrollTo({ top: 0 }) }, [pathname])
  return <div className={`feature-shell rights-shell ${pageClass}`} ref={shellRef}><FeatureHeader title={title} onQuickExit={onQuickExit} backTo={backTo} showBack={displayBack} /><main className="rights-main">{children}</main><ChatFab key={pathname} /><BottomNav warm /></div>
}

function GovernmentBanner() {
  return <a className="rights-gov-banner" href="https://www.gov.kr/portal/main/nologin" target="_blank" rel="noreferrer"><img src={`${ASSET_ROOT}/rights-government24-logo.png`} alt="" /><span><strong>정부24 바로가기 <ChevronRight size={14} /></strong><small>더 다양한 정부 서비스를 만나보세요!</small></span><img className="rights-gov-building" src={`${ASSET_ROOT}/rights-government-building.png`} alt="" /></a>
}

function CategoryTabs({ value, onChange }) {
  return <div className="rights-tabs" aria-label="서류 분류">{CATEGORIES.map((label) => <button key={label} type="button" className={value === label ? 'active' : ''} onClick={() => onChange(label)}>{label}</button>)}</div>
}

function FilterRow({ value, onChange }) {
  return <div className="rights-filter-row"><CategoryTabs value={value} onChange={onChange} /></div>
}

function PageControls({ page, totalPages, onChange }) {
  return <div className="rights-pagination" aria-label="책 페이지"><button type="button" disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="이전 책 페이지"><ChevronLeft size={20} /></button><strong>{page} / {totalPages}</strong><button type="button" disabled={page >= totalPages} onClick={() => onChange(page + 1)} aria-label="다음 책 페이지"><ChevronRight size={20} /></button></div>
}

function useBookPress(onClick, onLongPress) {
  const timerRef = useRef(null)
  const originRef = useRef(null)
  const longPressedRef = useRef(false)
  const clearTimer = () => {
    if (timerRef.current) window.clearTimeout(timerRef.current)
    timerRef.current = null
  }
  useEffect(() => clearTimer, [])
  return {
    onPointerDown: (event) => {
      if (!onLongPress || event.button !== 0) return
      longPressedRef.current = false
      originRef.current = { x: event.clientX, y: event.clientY }
      clearTimer()
      timerRef.current = window.setTimeout(() => {
        longPressedRef.current = true
        onLongPress()
        navigator.vibrate?.(24)
      }, 560)
    },
    onPointerMove: (event) => {
      const origin = originRef.current
      if (origin && Math.hypot(event.clientX - origin.x, event.clientY - origin.y) > 10) clearTimer()
    },
    onPointerUp: clearTimer,
    onPointerLeave: clearTimer,
    onPointerCancel: () => { clearTimer(); longPressedRef.current = false },
    onContextMenu: (event) => {
      if (!onLongPress) return
      event.preventDefault()
      clearTimer()
      longPressedRef.current = true
      onLongPress()
    },
    onClick: (event) => {
      if (longPressedRef.current) {
        event.preventDefault()
        event.stopPropagation()
        longPressedRef.current = false
        return
      }
      onClick?.()
    }
  }
}

function DeleteBookControls({ onCancel, onDelete }) {
  return <div className="rights-book-delete-controls" role="group" aria-label="책 삭제 확인"><span>삭제하시겠습니까?</span><button type="button" onClick={onCancel} aria-label="뒤로가기"><ChevronLeft size={18} /></button><button type="button" className="danger" onClick={onDelete} aria-label="내 서류함에서 삭제"><Trash2 size={17} /></button></div>
}

function BookCard({ book, variant = 'shelf', onClick, onLongPress, selectedForDelete = false, onCancelDelete, onConfirmDelete }) {
  const pressProps = useBookPress(onClick, onLongPress)
  const card = <button type="button" className={`rights-book rights-book-${book.tone} rights-book-${variant} ${selectedForDelete ? 'is-delete-target' : ''}`} aria-pressed={selectedForDelete} {...pressProps}><span className="rights-book-bookmark" /><strong>{book.shortTitle.split('\n').map((line) => <span key={line}>{line}</span>)}</strong><span className="rights-book-hill" /><img src={`${ASSET_ROOT}/${book.icon}`} alt="" />{variant === 'grid' && <span className="rights-book-ledge" />}</button>
  if (!onLongPress) return card
  return <div className="rights-book-delete-wrap">{card}{selectedForDelete && <DeleteBookControls onCancel={onCancelDelete} onDelete={onConfirmDelete} />}</div>
}

function CollectionBookCard({ collection, onClick, onLongPress, selectedForDelete = false, onCancelDelete, onConfirmDelete }) {
  const count = collection.documentIds.length
  const done = collection.checkedDocumentIds.filter((id) => collection.documentIds.includes(id)).length
  const progress = count ? Math.round((done / count) * 100) : 0
  const art = { 지원: 'rights-book-health.svg', 주거: 'rights-book-resident.svg', 생활: 'rights-book-family.svg', 일자리: 'rights-book-income.svg' }[collection.category] || 'rights-book-basic.svg'
  const pressProps = useBookPress(onClick, onLongPress)
  const card = <button type="button" className={`rights-book rights-collection-book rights-book-${toneForCategory(collection.category)} ${selectedForDelete ? 'is-delete-target' : ''}`} aria-pressed={selectedForDelete} {...pressProps}><span className="rights-book-bookmark" /><small>{collection.category} 준비</small><strong>{collection.title}</strong><span className="rights-book-hill" /><img className="rights-collection-art" src={`${ASSET_ROOT}/${art}`} alt="" /><span className="rights-collection-progress"><i style={{ width: `${progress}%` }} /></span><em>{done}/{count}</em></button>
  return <div className="rights-book-delete-wrap">{card}{selectedForDelete && <DeleteBookControls onCancel={onCancelDelete} onDelete={onConfirmDelete} />}</div>
}

function DialogShell({ title, onClose, children }) {
  return <div className="rights-sheet-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="rights-sheet" role="dialog" aria-modal="true" aria-label={title}><div className="rights-sheet-handle" /><header><strong>{title}</strong><button type="button" onClick={onClose} aria-label="닫기"><X size={20} /></button></header>{children}</section></div>
}

function DocumentPicker({ books = BOOKS, title = '서류 추가하기', selectedIds, onClose, onSave }) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(selectedIds)
  const visibleBooks = books.filter((book) => !query.trim() || book.title.includes(query.trim()))
  const toggle = (id) => setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
  return <DialogShell title={title} onClose={onClose}><label className="rights-sheet-search"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="서류 이름을 검색해보세요" /></label><div className="rights-document-picker">{visibleBooks.map((book) => { const active = selected.includes(book.id); return <button key={book.id} type="button" className={active ? 'active' : ''} onClick={() => toggle(book.id)}><span className={`rights-mini-book rights-book-${book.tone}`}><img src={`${ASSET_ROOT}/${book.icon}`} alt="" /></span><span><strong>{book.title}</strong><small>{book.category} 서류</small></span><span className="rights-picker-check">{active && <Check size={14} />}</span></button> })}</div><button type="button" className="rights-sheet-primary" onClick={() => onSave(selected)}>선택한 서류 저장하기</button></DialogShell>
}

function CreateCollectionDialog({ books = BOOKS, onClose, onCreate }) {
  const [title, setTitle] = useState('')
  const [suggestion, setSuggestion] = useState(null)
  const [selected, setSelected] = useState([])
  const [loading, setLoading] = useState(false)
  const suggest = async () => {
    const cleanTitle = title.trim()
    if (!cleanTitle) return
    setLoading(true)
    try {
      const response = await recommendRightsCollection(cleanTitle)
      const validIds = response.documentIds?.filter((id) => books.some((book) => book.id === id)) || []
      const next = validIds.length ? { category: response.category, documentIds: validIds } : fallbackCollectionSuggestion(cleanTitle)
      setSuggestion(next); setSelected(next.documentIds)
    } catch {
      const next = fallbackCollectionSuggestion(cleanTitle)
      setSuggestion(next); setSelected(next.documentIds)
    } finally { setLoading(false) }
  }
  const toggle = (id) => setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
  const create = () => onCreate({ id: `collection-${Date.now()}`, title: title.trim(), category: suggestion?.category || fallbackCollectionSuggestion(title).category, documentIds: selected, checkedDocumentIds: [] })
  return <DialogShell title="새 준비 책 만들기" onClose={onClose}><p className="rights-sheet-intro">준비할 일의 이름을 적으면 필요한 서류를 먼저 골라드려요. 나중에 서류를 더 넣거나 뺄 수 있어요.</p><label className="rights-collection-name"><span>책 이름</span><input value={title} onChange={(event) => { setTitle(event.target.value); setSuggestion(null) }} placeholder="예: 청년 월세 지원" maxLength={30} /></label>{!suggestion && <button type="button" className="rights-ai-suggest" disabled={!title.trim() || loading} onClick={suggest}>{loading ? '필요한 서류를 찾는 중…' : 'AI로 준비 목록 만들기'}</button>}{suggestion && <><div className="rights-suggestion-heading"><span>{suggestion.category}</span><strong>이 서류부터 준비해볼까요?</strong></div><div className="rights-suggestion-list">{suggestion.documentIds.map((id) => { const book = books.find((item) => item.id === id); if (!book) return null; const active = selected.includes(id); return <button type="button" key={id} className={active ? 'active' : ''} onClick={() => toggle(id)}><span>{active && <Check size={13} />}</span>{book.title}</button> })}</div><button type="button" className="rights-sheet-primary" disabled={!selected.length} onClick={create}>이 준비 책 만들기</button></>}</DialogShell>
}

function PreparationChecklist({ catalog = BOOKS, collection, onViewDocument, onToggle, onAddDocuments }) {
  const books = collection.documentIds.map((id) => catalog.find((book) => book.id === id)).filter(Boolean)
  const done = collection.checkedDocumentIds.filter((id) => collection.documentIds.includes(id)).length
  const progress = books.length ? Math.round((done / books.length) * 100) : 0
  return (
    <section className="rights-prep-card">
      <div className="rights-prep-heading"><span><small>{collection.category} · 나의 준비 목록</small><h1>{collection.title}</h1></span><button type="button" onClick={onAddDocuments}><Plus size={15} /> 서류 추가</button></div>
      <p>하나씩 준비하면 돼요. 벌써 {done}개를 모았어요.</p>
      <div className="rights-progress-row"><strong>{done} / {books.length} 준비</strong><b>{progress}%</b></div>
      <div className="rights-progress"><span style={{ width: `${progress}%` }} /></div>
      <div className="rights-prep-list">
        {books.map((book) => {
          const metadata = prepMetadataFor(book)
          const complete = collection.checkedDocumentIds.includes(book.id)
          return (
            <div key={book.id} className={`rights-prep-item ${complete ? 'done' : ''}`}>
              <button type="button" className="rights-check" onClick={() => onToggle(book.id)} aria-label={`${book.title} ${complete ? '준비 전으로 변경' : '준비 완료로 변경'}`} />
              <div className="rights-prep-document">
                <span><strong>{book.title}</strong><small>{metadata.detail}<br />유효 기준 · {metadata.rule}</small></span>
                <span className="rights-prep-actions"><em>{complete ? '준비완료' : '준비 전'}</em><button type="button" onClick={() => onViewDocument(book.id)}>찾아보기</button></span>
              </div>
            </div>
          )
        })}
      </div>
      {!books.length && <p className="rights-empty-list">아직 넣은 서류가 없어요. 위의 ‘서류 추가’를 눌러 채워보세요.</p>}
    </section>
  )
}

export function RightsHomePage({ onQuickExit }) {
  const navigate = useNavigate()
  const books = useRightsCatalog()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('전체')
  const [page, setPage] = useState(1)
  const filteredBooks = useMemo(() => books.filter((book) => (!query.trim() || book.title.includes(query.trim())) && (category === '전체' || book.category === category)), [books, category, query])
  const totalPages = Math.max(1, Math.ceil(filteredBooks.length / 4))
  const visibleBooks = filteredBooks.slice((page - 1) * 4, page * 4)
  const changeCategory = (nextCategory) => { setCategory(nextCategory); setPage(1) }
  return <RightsShell onQuickExit={onQuickExit} pageClass="rights-home-page"><section className="rights-featured"><span className="rights-pill">생활 · 필수 서류</span><h1>주민등록등본·초본</h1><p>내가 사는 곳과 누구와 살고 있는지 알려줘요. 초본은 내 주소가 바뀐 기록 등을 보여줘요.</p><div className="rights-document-art" aria-hidden="true"><strong>주민등록등본</strong><span /><span /><span /></div><img className="rights-sparkles" src={`${ASSET_ROOT}/rights-sparkles.png`} alt="" /></section><label className="rights-search rights-main-search"><Search size={21} /><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1) }} placeholder="필요한 서류를 검색해보세요!" /></label><CategoryTabs value={category} onChange={changeCategory} /><div className="rights-catalog-grid">{visibleBooks.map((book) => <BookCard key={book.id} book={book} variant="grid" onClick={() => navigate(`/rights/document/${book.id}`)} />)}</div>{visibleBooks.length === 0 && <p className="rights-catalog-empty">검색 결과가 없어요.</p>}<PageControls page={page} totalPages={totalPages} onChange={setPage} /><GovernmentBanner /><button type="button" className="rights-secondary-cta" onClick={() => navigate('/rights/catalog')}><FolderOpen size={24} /> 내 서류함으로 이동하기</button></RightsShell>
}

export function RightsCatalogPage({ onQuickExit }) {
  const navigate = useNavigate()
  const books = useRightsCatalog()
  const { savedDocumentIds, setSavedDocumentIds, collections, setCollections } = useRightsLibrary()
  const [view, setView] = useState('collections')
  const [category, setCategory] = useState('전체')
  const [page, setPage] = useState(1)
  const [dialog, setDialog] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const items = view === 'collections' ? collections : books.filter((book) => savedDocumentIds.includes(book.id) && (category === '전체' || book.category === category))
  const totalPages = Math.max(1, Math.ceil(items.length / 6))
  const safePage = Math.min(page, totalPages)
  const visibleItems = items.slice((safePage - 1) * 6, safePage * 6)
  const changeCategory = (nextCategory) => { setCategory(nextCategory); setPage(1) }
  const changeView = (nextView) => { setView(nextView); setCategory('전체'); setPage(1); setDeleteTarget(null) }
  const createCollection = (collection) => { setCollections((current) => [...current, collection]); setSavedDocumentIds((current) => [...new Set([...current, ...collection.documentIds])]); setDialog(null) }
  const deleteSelectedBook = () => {
    if (!deleteTarget) return
    if (deleteTarget.type === 'collection') setCollections((current) => current.filter((collection) => collection.id !== deleteTarget.id))
    else setSavedDocumentIds((current) => current.filter((id) => id !== deleteTarget.id))
    setDeleteTarget(null)
  }
  return <RightsShell title="내 서류함" onQuickExit={onQuickExit} backTo="/rights" showBack pageClass="rights-shelf-page"><div className="rights-library-switch" role="tablist" aria-label="내 서류함 보기"><button type="button" className={view === 'collections' ? 'active' : ''} onClick={() => changeView('collections')}>준비 책장</button><button type="button" className={view === 'documents' ? 'active' : ''} onClick={() => changeView('documents')}>보관 서류</button></div>{view === 'collections' ? <div className="rights-collection-toolbar"><span>책을 길게 누르면 삭제할 수 있어요.</span><button type="button" onClick={() => setDialog('collection')}><Plus size={17} /> 새 준비 책</button></div> : <FilterRow value={category} onChange={changeCategory} />}<section className="rights-bookshelf" aria-label={view === 'collections' ? '준비 책장' : '보관 서류 책장'}><img className="rights-bookshelf-bg" src={`${ASSET_ROOT}/rights-bookshelf.png`} alt="" /><div className="rights-shelf-grid">{view === 'collections' ? visibleItems.map((collection) => <CollectionBookCard key={collection.id} collection={collection} selectedForDelete={deleteTarget?.type === 'collection' && deleteTarget.id === collection.id} onLongPress={() => setDeleteTarget({ type: 'collection', id: collection.id, title: collection.title })} onCancelDelete={() => setDeleteTarget(null)} onConfirmDelete={deleteSelectedBook} onClick={() => { if (!deleteTarget) navigate(`/rights/documents?collection=${encodeURIComponent(collection.id)}`) }} />) : visibleItems.map((book) => <BookCard key={book.id} book={book} selectedForDelete={deleteTarget?.type === 'document' && deleteTarget.id === book.id} onLongPress={() => setDeleteTarget({ type: 'document', id: book.id, title: book.title })} onCancelDelete={() => setDeleteTarget(null)} onConfirmDelete={deleteSelectedBook} onClick={() => { if (!deleteTarget) navigate(`/rights/document/${book.id}`) }} />)}</div>{!visibleItems.length && <p className="rights-no-results">{view === 'collections' ? '아직 만든 준비 책이 없어요.' : '아직 보관한 서류가 없어요.'}</p>}</section><PageControls page={safePage} totalPages={totalPages} onChange={setPage} /><GovernmentBanner />{dialog === 'collection' && <CreateCollectionDialog books={books} onClose={() => setDialog(null)} onCreate={createCollection} />}</RightsShell>
}

export function RightsDocumentsPage({ onQuickExit }) {
  const navigate = useNavigate()
  const books = useRightsCatalog()
  const { setSavedDocumentIds, collections, setCollections } = useRightsLibrary()
  const { search } = useLocation()
  const requestedId = new URLSearchParams(search).get('collection')
  const [selectedId, setSelectedId] = useState(requestedId || collections[0]?.id)
  const [pickerOpen, setPickerOpen] = useState(false)
  const selected = collections.find((collection) => collection.id === selectedId) || collections[0]
  const updateSelected = (update) => setCollections((current) => current.map((collection) => collection.id === selected.id ? update(collection) : collection))
  const toggleDocument = (id) => updateSelected((collection) => ({ ...collection, checkedDocumentIds: collection.checkedDocumentIds.includes(id) ? collection.checkedDocumentIds.filter((item) => item !== id) : [...collection.checkedDocumentIds, id] }))
  const saveDocuments = (ids) => { updateSelected((collection) => ({ ...collection, documentIds: ids, checkedDocumentIds: collection.checkedDocumentIds.filter((id) => ids.includes(id)) })); setSavedDocumentIds((current) => [...new Set([...current, ...ids])]); setPickerOpen(false) }
  if (!selected) return <RightsShell title="내 서류함" onQuickExit={onQuickExit} backTo="/rights/catalog" showBack pageClass="rights-documents-page"><div className="rights-collection-empty"><FolderPlus size={42} /><h1>먼저 준비 책을 만들어주세요</h1><p>목적에 맞는 서류를 한곳에 모아 체크할 수 있어요.</p><button type="button" onClick={() => navigate('/rights/catalog')}>준비 책장으로 돌아가기</button></div></RightsShell>
  return <RightsShell title="내 서류함" onQuickExit={onQuickExit} backTo="/rights/catalog" showBack pageClass="rights-documents-page"><GovernmentBanner /><div className="rights-prep-tabs" aria-label="준비 책 선택">{collections.map((collection) => <button type="button" key={collection.id} className={selected.id === collection.id ? 'active' : ''} onClick={() => setSelectedId(collection.id)}>{collection.title}</button>)}</div><aside className="rights-privacy-note"><span aria-hidden="true" /><div><strong>서류 원본 대신, 준비 상태만 체크해요</strong><small>체크 내용은 익명 세션에 임시 저장돼요. 주민번호나 계좌번호는 입력하지 마세요.</small></div></aside><PreparationChecklist catalog={books} collection={selected} onViewDocument={(bookId) => navigate(`/rights/document/${bookId}`)} onToggle={toggleDocument} onAddDocuments={() => setPickerOpen(true)} />{pickerOpen && <DocumentPicker books={books} title={`${selected.title}에 서류 추가`} selectedIds={selected.documentIds} onClose={() => setPickerOpen(false)} onSave={saveDocuments} />}</RightsShell>
}

export function RightsDetailPage({ onQuickExit }) {
  const navigate = useNavigate()
  const books = useRightsCatalog()
  const { savedDocumentIds, setSavedDocumentIds } = useRightsLibrary()
  const { documentId = 'resident' } = useParams()
  const book = books.find((item) => item.id === documentId) || books[0]
  const detail = book?.detail || DOCUMENT_DETAILS[documentId] || { eyebrow: `${book.category} · 필요한 서류`, title: book.title, summary: `${book.title}을 준비할 때 필요한 발급 방법과 확인할 내용을 한눈에 살펴봐요.`, uses: [`${book.category} 지원`, '신청 서류', '자격 확인'], issuance: {}, checklist: [] }
  const bookIndex = books.findIndex((item) => item.id === book.id)
  const previousBook = books[(bookIndex - 1 + books.length) % books.length]
  const nextBook = books[(bookIndex + 1) % books.length]
  const saved = savedDocumentIds.includes(documentId)
  const toggleSaved = () => setSavedDocumentIds((current) => current.includes(documentId) ? current.filter((id) => id !== documentId) : [...current, documentId])
  const issuance = detail.issuance || {}
  const primarySource = issuance.online?.url || detail.sourceUrl
  return <RightsShell onQuickExit={onQuickExit} backTo="/rights" pageClass="rights-detail-page"><article className="rights-detail-card"><small>{detail.eyebrow}</small><h1>{detail.title}</h1><p className="rights-detail-summary">{detail.summary}</p><section><h2>어디서 떼요?</h2><dl>{issuance.online && <div><dt>온라인</dt><dd><a href={issuance.online.url} target="_blank" rel="noreferrer">{issuance.online.label} <ExternalLink size={12} /></a><small>{issuance.online.note}</small></dd></div>}{issuance.visit && <div><dt>방문</dt><dd>{issuance.visit.label}<small>{issuance.visit.note}</small></dd></div>}{issuance.kiosk && <div><dt>무인발급기</dt><dd>{issuance.kiosk.label}<small>{issuance.kiosk.note}</small></dd></div>}</dl></section><section><h2>누가 뗄 수 있나요?</h2><p>{detail.eligibility}</p><small>{detail.proxyNote}</small></section><section><h2>이럴 때 필요해요</h2><div className="rights-use-chips">{detail.uses.map((use) => <span key={use}>{use}</span>)}</div></section><section><h2>떼기 전에 꼭 확인해요</h2><ul>{detail.checklist.map((item) => <li key={item}>{item}</li>)}</ul></section><footer>출처 · {detail.sourceLabel}<br />확인 날짜 · {detail.verifiedAt}</footer></article><div className="rights-detail-pagination"><button type="button" onClick={() => navigate(`/rights/document/${previousBook.id}`)}>‹ 이전 장</button><span><b />•••••••</span><button type="button" onClick={() => navigate(`/rights/document/${nextBook.id}`)}>다음 장 ›</button></div><button type="button" className={`rights-prepared ${saved ? 'active' : ''}`} onClick={toggleSaved}>{saved ? <FolderOpen size={19} /> : <FolderPlus size={19} />}<strong>{saved ? '보관 중 · 내 서류함에서 빼기' : '내 서류함에 넣기'}</strong></button>{primarySource && <a className="rights-primary-cta" href={primarySource} target="_blank" rel="noreferrer">{issuance.online?.label || '공식 발급 안내 확인하기'} <ExternalLink size={16} /></a>}</RightsShell>
}
