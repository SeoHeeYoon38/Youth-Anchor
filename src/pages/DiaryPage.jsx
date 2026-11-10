import { CalendarDays, Check, ChevronLeft, ChevronRight, ClipboardCheck, ImagePlus, LockKeyhole, Pencil, Plus, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import FeatureHeader from '../components/FeatureHeader.jsx'

const ASSET_ROOT = '/figma/features'
const DIARY_KEY = 'haven-mood-diary'
const TASKS_KEY = 'haven-diary-tasks'

const MOODS = [
  { id: 'sun', label: '햇살', icon: 'mood-sun.svg' },
  { id: 'rainbow', label: '무지개', icon: 'mood-rainbow.svg' },
  { id: 'cloud', label: '구름', icon: 'mood-cloud.svg' },
  { id: 'rain', label: '비내림', icon: 'mood-rain.svg' },
  { id: 'lightning', label: '번개', icon: 'mood-lightning.svg' },
  { id: 'quilt', label: '이불', icon: 'mood-quilt.png' }
]

const CHARACTER_IMAGES = Array.from({ length: 6 }, (_, index) => `diary-character-${index + 1}.png`)

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

function DiaryShell({ title = '내 일기장', onQuickExit, backTo = '/home', children }) {
  const { pathname } = useLocation()
  const shellRef = useRef(null)

  useEffect(() => {
    shellRef.current?.scrollTo({ top: 0 })
  }, [pathname])

  return (
    <div className="feature-shell diary-shell" ref={shellRef}>
      <FeatureHeader title={title} onQuickExit={onQuickExit} backTo={backTo} />
      <main className="diary-main">{children}</main>
    </div>
  )
}

function DiaryTabs({ active }) {
  const navigate = useNavigate()
  return (
    <nav className="diary-tabs" aria-label="일기장 메뉴">
      <button type="button" className={active === 'home' ? 'active' : ''} onClick={() => navigate('/diary')}><CalendarDays size={21} />홈</button>
      <button type="button" className={active === 'tasks' ? 'active' : ''} onClick={() => navigate('/diary/checklist')}><ClipboardCheck size={21} />체크리스트</button>
    </nav>
  )
}

function MoodIcon({ moodId, className = '' }) {
  const mood = MOODS.find((item) => item.id === moodId) || MOODS[0]
  return <img className={className} src={`${ASSET_ROOT}/${mood.icon}`} alt={mood.label} />
}

export function DiaryHomePage({ onQuickExit }) {
  const navigate = useNavigate()
  const [cursor, setCursor] = useState(() => new Date())
  const [entries] = useState(() => readJson(DIARY_KEY, []))
  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDay = new Date(year, month, 1).getDay()
  const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`
  const monthEntries = entries.filter((entry) => entry.date?.startsWith(monthPrefix))
  const entryByDate = new Map(monthEntries.map((entry) => [entry.date, entry]))
  const moodCounts = MOODS.map((mood) => ({ ...mood, count: monthEntries.filter((entry) => entry.mood === mood.id).length }))

  const changeMonth = (amount) => setCursor(new Date(year, month + amount, 1))

  return (
    <DiaryShell onQuickExit={onQuickExit}>
      <section className="diary-intro"><small>HAVEN / MY DIARY</small><h1>하루를 남기고, 마음을 돌봐요</h1><p>어떤 마음이든 괜찮아요. 나만의 속도로 기록해요.</p></section>
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
            return <button type="button" key={key} className={isToday ? 'today' : ''} onClick={() => navigate(`/diary/new?date=${key}`)}><span>{day}</span>{entry && <MoodIcon moodId={entry.mood} />}</button>
          })}
        </div>
      </section>
      <section className="diary-summary">
        <div className="diary-section-title"><h2>이번 달 많이 고른 마음</h2><span>{month + 1}월의 기록</span></div>
        <div className="diary-mood-stats">{moodCounts.map((mood) => <div key={mood.id}><MoodIcon moodId={mood.id} /><span>{mood.label}</span><strong>{mood.count}회</strong></div>)}</div>
      </section>
      <button type="button" className="diary-primary" onClick={() => navigate('/diary/new')}><Pencil size={19} /> 오늘 마음 남기기</button>
      <p className="diary-private"><LockKeyhole size={14} /> 이 기기에만 저장돼요. 지워도 불이익은 없어요.</p>
      <DiaryTabs active="home" />
    </DiaryShell>
  )
}

export function DiaryEntryPage({ onQuickExit }) {
  const navigate = useNavigate()
  const queryDate = new URLSearchParams(useLocation().search).get('date')
  const [step, setStep] = useState(1)
  const [mood, setMood] = useState('sun')
  const [character, setCharacter] = useState(0)
  const [text, setText] = useState('')
  const [preview, setPreview] = useState('')
  const [tasks, setTasks] = useState(['', '', ''])

  const addTask = () => setTasks((current) => [...current, ''])
  const updateTask = (index, value) => setTasks((current) => current.map((item, itemIndex) => itemIndex === index ? value : item))

  const save = () => {
    const date = queryDate || toDateKey(new Date())
    const entries = readJson(DIARY_KEY, [])
    const entry = { date, mood, character, text: text.trim(), tasks: tasks.map((task) => task.trim()).filter(Boolean), updatedAt: new Date().toISOString() }
    localStorage.setItem(DIARY_KEY, JSON.stringify([...entries.filter((item) => item.date !== date), entry]))
    const existingTasks = readJson(TASKS_KEY, [])
    const addedTasks = entry.tasks.map((task, index) => ({ id: `${Date.now()}-${index}`, text: task, done: false }))
    localStorage.setItem(TASKS_KEY, JSON.stringify([...existingTasks, ...addedTasks]))
    navigate('/diary')
  }

  return (
    <DiaryShell title="마음 남기기" onQuickExit={onQuickExit} backTo="/diary">
      <div className="diary-step-dots" aria-label={`${step}단계`}><span className={step === 1 ? 'active' : ''} /><span className={step === 2 ? 'active' : ''} /><span className={step === 3 ? 'active' : ''} /></div>
      {step === 1 && <section className="diary-entry-step"><h1>오늘 기분에 맞는 이모지를<br />선택해보세요</h1><div className="diary-character-grid">{CHARACTER_IMAGES.map((image, index) => <button type="button" key={image} className={character === index ? 'selected' : ''} onClick={() => { setCharacter(index); setMood(MOODS[index % MOODS.length].id) }}><img src={`${ASSET_ROOT}/${image}`} alt={`가온 표정 ${index + 1}`} /></button>)}</div><div className="diary-weather-grid">{MOODS.map((item) => <button type="button" key={item.id} className={mood === item.id ? 'selected' : ''} onClick={() => setMood(item.id)}><MoodIcon moodId={item.id} /><span>{item.label}</span></button>)}</div></section>}
      {step === 2 && <section className="diary-entry-step"><h1>오늘은 어떤 날인가요?</h1><div className="diary-note-card"><label><Pencil size={21} /><textarea value={text} onChange={(event) => setText(event.target.value)} placeholder="내용을 입력해 주세요." /></label><label className="diary-photo"><input type="file" accept="image/*" onChange={(event) => { const file = event.target.files?.[0]; if (file) setPreview(URL.createObjectURL(file)) }} />{preview ? <><img src={preview} alt="첨부 미리보기" /><button type="button" onClick={(event) => { event.preventDefault(); setPreview('') }} aria-label="사진 지우기"><X size={16} /></button></> : <><ImagePlus size={48} /><span>사진을 첨부할 수 있어요</span></>}</label></div></section>}
      {step === 3 && <section className="diary-entry-step"><h1>체크리스트도 작성해보세요!</h1><div className="diary-task-editor">{tasks.map((task, index) => <input key={index} value={task} onChange={(event) => updateTask(index, event.target.value)} placeholder="내용을 입력해 주세요." />)}<button type="button" onClick={addTask} aria-label="체크리스트 항목 추가"><Plus size={27} /></button></div></section>}
      <div className="diary-step-actions">{step > 1 && <button type="button" className="secondary" onClick={() => setStep((current) => current - 1)}>이전</button>}<button type="button" className="diary-primary" onClick={() => step < 3 ? setStep((current) => current + 1) : save()}>{step === 3 ? '저장하기' : '다음'}</button>{step === 3 && <button type="button" className="diary-skip" onClick={save}>체크리스트 없이 저장</button>}</div>
    </DiaryShell>
  )
}

export function DiaryChecklistPage({ onQuickExit }) {
  const [filter, setFilter] = useState('todo')
  const [tasks, setTasks] = useState(() => readJson(TASKS_KEY, []))
  const [newTask, setNewTask] = useState('')

  useEffect(() => { localStorage.setItem(TASKS_KEY, JSON.stringify(tasks)) }, [tasks])

  const visibleTasks = tasks.filter((task) => filter === 'done' ? task.done : !task.done)
  const toggle = (id) => setTasks((current) => current.map((task) => task.id === id ? { ...task, done: !task.done } : task))
  const add = () => {
    const value = newTask.trim()
    if (!value) return
    setTasks((current) => [...current, { id: String(Date.now()), text: value, done: false }])
    setNewTask('')
  }

  return (
    <DiaryShell title="체크리스트" onQuickExit={onQuickExit} backTo="/diary">
      <section className="diary-checklist-head"><small>HAVEN / MY CHECKLIST</small><h1>오늘 할 일을 천천히 정리해요</h1><p>작은 것부터 하나씩 체크해도 충분해요.</p></section>
      <div className="diary-checklist-filters"><button type="button" className={filter === 'todo' ? 'active' : ''} onClick={() => setFilter('todo')}>TO DO</button><button type="button" className={filter === 'done' ? 'active' : ''} onClick={() => setFilter('done')}>완료</button></div>
      <div className="diary-add-task"><input value={newTask} onChange={(event) => setNewTask(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') add() }} placeholder="새 할 일을 입력해 주세요." /><button type="button" onClick={add}><Plus size={20} /></button></div>
      <section className="diary-task-list">{visibleTasks.length === 0 ? <div className="diary-empty"><ClipboardCheck size={36} /><strong>{filter === 'done' ? '아직 완료한 일이 없어요' : '등록한 할 일이 없어요'}</strong><p>필요할 때 부담 없이 적어보세요.</p></div> : visibleTasks.map((task) => <button type="button" key={task.id} onClick={() => toggle(task.id)}><span className={task.done ? 'done' : ''}>{task.done && <Check size={16} />}</span><strong>{task.text}</strong><ChevronRight size={18} /></button>)}</section>
      <DiaryTabs active="tasks" />
    </DiaryShell>
  )
}

