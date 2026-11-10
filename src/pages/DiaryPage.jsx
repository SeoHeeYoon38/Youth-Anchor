import { CalendarDays, Check, ChevronLeft, ChevronRight, ClipboardCheck, LockKeyhole, Pencil, Plus } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import FeatureHeader from '../components/FeatureHeader.jsx'

const ASSET_ROOT = '/figma/features'
const DIARY_ASSET_ROOT = `${ASSET_ROOT}/diary`
const DIARY_EMOJI_ROOT = `${DIARY_ASSET_ROOT}/figma-emoji`
const DIARY_KEY = 'haven-mood-diary'
const TASKS_KEY = 'haven-diary-tasks'

const CHARACTER_OPTIONS = [
  { id: 'character-0', label: '차분해요', icon: 'character-calm.svg' },
  { id: 'character-1', label: '놀랐어요', icon: 'character-surprised.svg' },
  { id: 'character-2', label: '마음이 복잡해요', icon: 'character-pair-sad.svg' },
  { id: 'character-3', label: '기분이 좋아요', icon: 'character-wink-crop.svg' },
  { id: 'character-4', label: '외로워요', icon: 'character-pair-wide.svg' },
  { id: 'character-5', label: '슬퍼요', icon: 'character-cry.svg' },
  { id: 'character-6', label: '깜짝 놀랐어요', icon: 'character-surprised-2.svg' },
  { id: 'character-7', label: '피곤해요', icon: 'character-sleep.svg' }
]

const MOODS = [
  { id: 'sun', label: '햇살', description: '기분이 좋아요', icon: 'weather-sun.svg' },
  { id: 'rainbow', label: '무지개', description: '마음이 설레요', icon: 'weather-rainbow.svg' },
  { id: 'cloud', label: '구름', description: '마음이 흐려요', icon: 'weather-cloud.svg' },
  { id: 'rain', label: '비내림', description: '조용히 쉬고 싶어요', icon: 'weather-rain.svg' },
  { id: 'lightning', label: '번개', description: '마음이 복잡해요', icon: 'weather-lightning.svg' },
  { id: 'quilt', label: '이불', description: '포근히 쉬고 싶어요', icon: 'weather-quilt.svg' },
  { id: 'smile', label: '미소', description: '마음이 편안해요', icon: 'weather-smile.svg' },
  { id: 'flower', label: '꽃', description: '마음이 피어났어요', icon: 'weather-flower.svg' }
]

function readJson(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || 'null')
    return value ?? fallback
  } catch {
    return fallback
  }
}

function toDateKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function readDiaryPhoto(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error)
    reader.onload = () => {
      const source = String(reader.result || '')
      const image = new Image()
      image.onerror = () => resolve(source)
      image.onload = () => {
        const limit = 960
        const scale = Math.min(1, limit / Math.max(image.width, image.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.round(image.width * scale))
        canvas.height = Math.max(1, Math.round(image.height * scale))
        canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', .82))
      }
      image.src = source
    }
    reader.readAsDataURL(file)
  })
}

function DiaryShell({ title = '내 일기장', onQuickExit, backTo = '/home', scrollKey, children }) {
  const { pathname } = useLocation()
  const shellRef = useRef(null)
  const screenClass = pathname === '/diary/new' ? 'diary-shell-entry' : pathname === '/diary/checklist' ? 'diary-shell-checklist' : 'diary-shell-calendar'

  useEffect(() => {
    shellRef.current?.scrollTo({ top: 0 })
  }, [pathname, scrollKey])

  return (
    <div className={`feature-shell diary-shell ${screenClass}`} ref={shellRef}>
      <FeatureHeader title={title} onQuickExit={onQuickExit} backTo={backTo} />
      <main className="diary-main">{children}</main>
    </div>
  )
}

function DiaryTabs({ active }) {
  const navigate = useNavigate()
  return (
    <nav className="diary-tabs" aria-label="일기장 메뉴">
      <button type="button" className={active === 'calendar' ? 'active' : ''} onClick={() => navigate('/diary')}><CalendarDays size={19} />캘린더</button>
      <button type="button" className={active === 'tasks' ? 'active' : ''} onClick={() => navigate('/diary/checklist')}><ClipboardCheck size={21} />체크리스트</button>
    </nav>
  )
}

function MoodIcon({ moodId, className = '' }) {
  const mood = MOODS.find((item) => item.id === moodId) || MOODS[0]
  return <img className={className} src={`${DIARY_EMOJI_ROOT}/${mood.icon}`} alt={mood.label} />
}

function DiaryVisual({ entry, className = '' }) {
  const visual = entry.visual || `mood-${entry.mood || 'sun'}`
  if (visual.startsWith('character-')) {
    const character = CHARACTER_OPTIONS.find((item) => item.id === visual) || CHARACTER_OPTIONS[0]
    return <img className={className} src={`${DIARY_EMOJI_ROOT}/${character.icon}`} alt={character.label} />
  }
  return <MoodIcon moodId={visual.replace('mood-', '')} className={className} />
}

function DiaryProgress({ step, total = 2 }) {
  return (
    <div className="diary-step-dots" aria-label={`${step}단계`}>
      {Array.from({ length: total }, (_, index) => index + 1).map((item) => <img key={item} src={`${DIARY_ASSET_ROOT}/step-marker-1.svg`} className={item <= step ? 'active' : ''} alt="" />)}
    </div>
  )
}

function formatDiaryDate(dateKey) {
  const date = new Date(`${dateKey}T00:00:00`)
  const weekdays = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일']
  return `${date.getMonth() + 1}월 ${date.getDate()}일 ${weekdays[date.getDay()]}`
}

function DiaryEntrySheet({ entry, onClose, onEdit }) {
  const visual = entry.visual || `mood-${entry.mood || 'sun'}`
  const mood = MOODS.find((item) => visual === `mood-${item.id}`)
  const character = CHARACTER_OPTIONS.find((item) => item.id === visual)
  return (
    <div className="diary-entry-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="diary-entry-sheet" role="dialog" aria-modal="true" aria-labelledby="diary-entry-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="diary-entry-handle"><img src={`${DIARY_ASSET_ROOT}/sheet/asset-1.svg`} alt="" /></div>
        <header>
          <h2 id="diary-entry-title">{formatDiaryDate(entry.date)}</h2>
          <p>{mood ? `${mood.label} · ${mood.description}` : `${character?.label || '가온 표정'} · 오늘의 마음`}</p>
        </header>
        <div className="diary-entry-preview">
          {entry.photo ? <img className="diary-entry-photo" src={entry.photo} alt="첨부 사진" /> : <DiaryVisual entry={entry} />}
          <p>{entry.text || '오늘의 마음을 기록했어요.'}</p>
          <button type="button" onClick={onEdit} aria-label={`${formatDiaryDate(entry.date)} 기록 수정`}><img src={`${DIARY_ASSET_ROOT}/sheet/asset-5.svg`} alt="" /></button>
        </div>
      </section>
    </div>
  )
}

export function DiaryHomePage({ onQuickExit }) {
  const navigate = useNavigate()
  const [cursor, setCursor] = useState(() => new Date())
  const [entries] = useState(() => readJson(DIARY_KEY, []))
  const [selectedEntry, setSelectedEntry] = useState(null)
  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDay = new Date(year, month, 1).getDay()
  const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`
  const monthEntries = entries.filter((entry) => entry.date?.startsWith(monthPrefix))
  const entryByDate = new Map(monthEntries.map((entry) => [entry.date, entry]))

  const changeMonth = (amount) => setCursor(new Date(year, month + amount, 1))

  return (
    <DiaryShell onQuickExit={onQuickExit}>
      <section className="diary-intro"><small>HAVEN / MY DIARY</small><h1>하루를 남기고, 마음을 돌봐요</h1><p>어떤 마음이든 괜찮아요. 나만의 속도로 기록해요.</p></section>
      <DiaryTabs active="calendar" />
      <section className="diary-calendar-card">
        <div className="diary-calendar-head"><button type="button" onClick={() => changeMonth(-1)} aria-label="이전 달"><ChevronLeft size={18} /></button><h2>{year}년 {month + 1}월</h2><button type="button" onClick={() => changeMonth(1)} aria-label="다음 달"><ChevronRight size={18} /></button><span>이번 달 기록 {monthEntries.length}일</span></div>
        <div className="diary-weekdays">{['일', '월', '화', '수', '목', '금', '토'].map((day) => <span key={day}>{day}</span>)}</div>
        <div className="diary-days">
          {Array.from({ length: firstDay }, (_, index) => <span key={`blank-${index}`} />)}
          {Array.from({ length: daysInMonth }, (_, index) => {
            const day = index + 1
            const key = `${monthPrefix}-${String(day).padStart(2, '0')}`
            const entry = entryByDate.get(key)
            const isToday = key === toDateKey(new Date())
            return <button type="button" key={key} className={isToday ? 'today' : ''} onClick={() => entry ? setSelectedEntry(entry) : navigate(`/diary/new?date=${key}`)}><span>{day}</span>{entry && (entry.photo ? <img className="diary-calendar-photo" src={entry.photo} alt="첨부 사진" /> : <DiaryVisual entry={entry} />)}</button>
          })}
        </div>
      </section>
      <button type="button" className="diary-primary" onClick={() => navigate('/diary/new')}><Pencil size={19} /> 오늘 마음 남기기</button>
      <p className="diary-private"><LockKeyhole size={14} /> 이 기기에만 저장돼요. 지워도 불이익은 없어요.</p>
      {selectedEntry && <DiaryEntrySheet entry={selectedEntry} onClose={() => setSelectedEntry(null)} onEdit={() => navigate(`/diary/new?date=${selectedEntry.date}`)} />}
    </DiaryShell>
  )
}

export function DiaryEntryPage({ onQuickExit }) {
  const navigate = useNavigate()
  const queryDate = new URLSearchParams(useLocation().search).get('date')
  const existingEntry = queryDate ? readJson(DIARY_KEY, []).find((entry) => entry.date === queryDate) : null
  const [step, setStep] = useState(1)
  const [visual, setVisual] = useState(existingEntry?.visual || `mood-${existingEntry?.mood || 'sun'}`)
  const [text, setText] = useState(existingEntry?.text || '')
  const [preview, setPreview] = useState(existingEntry?.photo || '')

  const save = () => {
    const date = queryDate || toDateKey(new Date())
    const entries = readJson(DIARY_KEY, [])
    const entry = { date, visual, text: text.trim(), photo: preview, updatedAt: new Date().toISOString() }
    localStorage.setItem(DIARY_KEY, JSON.stringify([...entries.filter((item) => item.date !== date), entry]))
    navigate('/diary')
  }

  return (
    <DiaryShell title="마음 남기기" onQuickExit={onQuickExit} backTo="/diary" scrollKey={step}>
      <div className={`diary-entry-flow step-${step}`}>
        <div className="diary-entry-intro">
          <DiaryProgress step={step} />
          <h1>{step === 1 ? <>오늘 기분에 맞는 이모지를<br />선택해보세요</> : '오늘은 어떤 날인가요?'}</h1>
        </div>
        <section className={`diary-entry-panel step-${step}`}>
          {step === 1 && <div className="diary-entry-choices"><div className="diary-emoji-grid">{CHARACTER_OPTIONS.map((item) => <button type="button" key={item.id} className={`diary-emoji-button character ${visual === item.id ? 'selected' : ''}`} onClick={() => setVisual(item.id)} aria-label={item.label}><img src={`${DIARY_EMOJI_ROOT}/${item.icon}`} alt="" /></button>)}{MOODS.map((item) => <button type="button" key={item.id} className={`diary-emoji-button weather ${visual === `mood-${item.id}` ? 'selected' : ''}`} onClick={() => setVisual(`mood-${item.id}`)} aria-label={item.label}><MoodIcon moodId={item.id} /><span>{item.label}</span></button>)}</div></div>}
          {step === 2 && <div className="diary-note-card diary-entry-form-card"><label className="diary-note-field"><img src={`${DIARY_ASSET_ROOT}/entry-pencil.svg`} alt="" /><textarea value={text} onChange={(event) => setText(event.target.value)} placeholder="내용을 입력해 주세요." /></label><label className="diary-photo"><input type="file" accept="image/*" onChange={async (event) => { const file = event.target.files?.[0]; if (file) setPreview(await readDiaryPhoto(file)); event.target.value = '' }} />{preview ? <img src={preview} alt="첨부 미리보기" /> : <><img src={`${DIARY_ASSET_ROOT}/photo-placeholder.png`} alt="" /><span>사진을 첨부할 수 있어요</span></>}</label></div>}
          <div className="diary-step-actions"><button type="button" className="diary-primary" onClick={() => step < 2 ? setStep(2) : save()}>{step === 2 ? '기록 완료' : '다음'}</button></div>
        </section>
      </div>
    </DiaryShell>
  )
}

export function DiaryChecklistPage({ onQuickExit }) {
  const [tasks, setTasks] = useState(() => readJson(TASKS_KEY, []))
  const [newTask, setNewTask] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [draft, setDraft] = useState('')

  useEffect(() => { localStorage.setItem(TASKS_KEY, JSON.stringify(tasks)) }, [tasks])

  const toggle = (id) => {
    if (editingId !== null) return
    setTasks((current) => current.map((task) => task.id === id ? { ...task, done: !task.done } : task))
  }
  const add = () => {
    const value = newTask.trim()
    if (!value) return
    setTasks((current) => [...current, { id: String(Date.now()), text: value, done: false }])
    setNewTask('')
  }
  const startEdit = (task) => {
    setEditingId(task.id)
    setDraft(task.text)
  }
  const saveEdit = (id) => {
    const value = draft.trim()
    if (value) setTasks((current) => current.map((task) => task.id === id ? { ...task, text: value } : task))
    setEditingId(null)
    setDraft('')
  }

  return (
    <DiaryShell title="체크리스트" onQuickExit={onQuickExit} backTo="/diary">
      <section className="diary-checklist-head"><small>HAVEN / MY CHECKLIST</small><h1>오늘 할 일을 천천히 정리해요</h1><p>작은 것부터 하나씩 체크해도 충분해요.</p></section>
      <DiaryTabs active="tasks" />
      <div className="diary-add-task"><input value={newTask} onChange={(event) => setNewTask(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') add() }} placeholder="새 할 일을 입력해 주세요." /><button type="button" onClick={add} aria-label="체크리스트 추가"><Plus size={24} /></button></div>
      <section className="diary-task-list">{tasks.length === 0 ? <div className="diary-empty"><ClipboardCheck size={36} /><strong>등록한 할 일이 없어요</strong><p>필요할 때 부담 없이 적어보세요.</p></div> : tasks.map((task) => <div className="diary-task-row" key={task.id}><button type="button" className={`diary-task-check ${task.done ? 'done' : ''}`} onClick={() => toggle(task.id)} disabled={editingId !== null} aria-disabled={editingId !== null} aria-label={`${task.text} ${task.done ? '완료 취소' : '완료'}`}>{task.done && <Check size={22} strokeWidth={3} />}</button>{editingId === task.id ? <input className="diary-task-edit-input" value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') saveEdit(task.id); if (event.key === 'Escape') setEditingId(null) }} autoFocus /> : <strong className={task.done ? 'done' : ''}>{task.text}</strong>}<button type="button" className="diary-task-edit" onClick={() => editingId === task.id ? saveEdit(task.id) : startEdit(task)} disabled={editingId !== null && editingId !== task.id} aria-label={`${task.text} 수정`}>{editingId === task.id ? <Check size={18} /> : <img src={`${DIARY_ASSET_ROOT}/entry-pencil.svg`} alt="" />}</button></div>)}</section>
    </DiaryShell>
  )
}

