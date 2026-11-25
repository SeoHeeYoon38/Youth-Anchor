import {
  Bell,
  CircleAlert,
  Clock3,
  ExternalLink,
  FileHeart,
  LockKeyhole,
  MessageCircle,
  Navigation,
  Phone,
  Power,
  ShieldCheck,
  X
} from 'lucide-react'
import { useEffect, useRef } from 'react'
import { buildKakaoDirectionsUrl } from '../kakaoDirections.js'
import { shelterStatusUrl } from '../../shared/shelterStatus.js'

function SheetFrame({ children, onClose, labelledBy, className = '' }) {
  const dialog = useRef(null)
  useEffect(() => {
    const trigger = document.activeElement
    dialog.current?.focus()
    return () => { trigger?.focus({ preventScroll: true }) }
  }, [])

  function handleKey(event) {
    if (event.key === 'Escape') onClose()
    if (event.key !== 'Tab') return
    const controls = dialog.current.querySelectorAll('a[href], button:not(:disabled)')
    if (!controls.length) return
    const first = controls[0]
    const last = controls[controls.length - 1]
    if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }
  return (
    <div className="sheet-backdrop" role="presentation" onMouseDown={onClose}>
      <section ref={dialog} tabIndex={-1} onKeyDown={handleKey} className={`bottom-sheet ${className}`} role="dialog" aria-modal="true" aria-labelledby={labelledBy} onMouseDown={(event) => event.stopPropagation()}>
        <div className="sheet-handle" />
        {children}
      </section>
    </div>
  )
}

export function ShelterSheet({ shelter, origin = null, onClose }) {
  const mapUrl = buildKakaoDirectionsUrl({ shelter, origin })
  const [firstPhone] = (shelter.phone || '').trim().split(/[,;/~]/)
  const displayPhone = firstPhone.trim().replace(/^(02|0\d{2})(\d{3,4})(\d{4})$/, '$1-$2-$3')
  const dialNumber = firstPhone.replace(/[\s().-]/g, '')
  const hasPhone = /^(?:0\d{8,10}|\+82\d{8,10}|1[5-8]\d{6})$/.test(dialNumber)
  const target = shelter.entryTarget || (shelter.source === 'mogef-teen-shelter' ? '' : shelter.ages)
  const inquiry = '쉼터에 문의'
  return (
    <SheetFrame onClose={onClose} labelledBy="shelter-sheet-title" className="shelter-sheet warm-sheet">
      <header className="shelter-detail-heading">
        <img src="/figma/warm/map-shelter.svg" alt="" />
        <div>
          <p>{[shelter.gender, shelter.type].filter(Boolean).join(' · ')}</p>
          <h2 id="shelter-sheet-title">{shelter.name}</h2>
        </div>
        <button type="button" className="help-close" onClick={onClose} aria-label="쉼터 상세 닫기"><X size={19} /></button>
      </header>
      <dl className="shelter-admission">
        <div className="shelter-capacity"><dt>전체 정원</dt>
          <dd><span>{Number.isInteger(shelter.capacity) && shelter.capacity >= 0 ? `${shelter.capacity}명` : inquiry}</span>
            <a className="shelter-status-action" href={shelterStatusUrl(shelter)} target="_blank" rel="noreferrer">
              공식 입소 현황 보기 <ExternalLink size={14} aria-hidden="true" />
            </a>
          </dd>
        </div>
        <div><dt>입소 대상</dt><dd>{target || inquiry}</dd></div>
        <div><dt>입소 기간</dt><dd>{shelter.entryPeriod || inquiry}</dd></div>
        <div><dt>주소</dt><dd>{shelter.address || inquiry}</dd></div>
        <div><dt>대표전화</dt><dd>{hasPhone ? <a href={`tel:${dialNumber}`}>{displayPhone}</a> : '시설 번호 미제공'}</dd></div>
      </dl>
      <p className="admission-note">현재 입소 가능 여부는 방문 전에 전화로 확인해 주세요.</p>
      <div className="sheet-actions">
        <a className="secondary-action" href={hasPhone ? `tel:${dialNumber}` : 'tel:1388'} aria-label={hasPhone ? '전화로 입소 가능 여부 확인' : '청소년상담 1388에 문의'}>
          <Phone size={18} /> {hasPhone ? '전화 확인' : '1388 문의'}
        </a>
        <a className="primary-action" href={mapUrl} target="_blank" rel="noreferrer" aria-label="카카오맵 길 찾기"><Navigation size={18} /> 경로 안내받기</a>
      </div>
    </SheetFrame>
  )
}

export function SupportSheet({ support, onClose }) {
  const applicationUrl = /^https?:\/\//i.test(support.applicationUrl || '') ? support.applicationUrl : null
  return (
    <SheetFrame onClose={onClose} labelledBy="support-sheet-title" className="support-sheet warm-sheet">
      <div className="sheet-title-row">
        <span className="sheet-place-icon support"><FileHeart size={26} /></span>
        <div><span className={`category-badge category-${support.category}`}>{support.category}</span><h2 id="support-sheet-title">{support.title}</h2><p>{support.provider}</p></div>
        <button className="icon-button" onClick={onClose} aria-label="닫기"><X size={20} /></button>
      </div>
      <p className="support-sheet-body">{support.body}</p>
      <div className="tag-row large">{support.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
      <div className="support-deadline"><Clock3 size={18} /><span>신청 기간</span><strong>{support.deadline}</strong></div>
      <p className="sheet-warning"><CircleAlert size={17} /> 신청 조건과 기간은 운영기관의 최신 공고에서 한 번 더 확인해 주세요.</p>
      {applicationUrl ? (
        <a className="primary-action full" href={applicationUrl} target="_blank" rel="noreferrer"><ExternalLink size={18} /> 운영기관에서 신청하기</a>
      ) : (
        <a className="primary-action full" href="tel:1388"><Phone size={18} /> 1388에 지원 문의하기</a>
      )}
    </SheetFrame>
  )
}

export function GuideSheet({ onClose, onOpenNotices }) {
  const guides = [
    { icon: LockKeyhole, title: '개인정보 말하지 않기', copy: '이름, 학교, 상세 주소는 안전이 확인되기 전까지 공유하지 않아도 돼요.' },
    { icon: Power, title: '위험할 땐 바로 화면 바꾸기', copy: '상단 긴급 종료를 누르면 기록을 정리하고 포털로 이동해요.' },
    { icon: MessageCircle, title: '공용 기기에서는 시크릿 모드', copy: '이용을 마치면 열린 탭과 다운로드 기록도 함께 확인해 주세요.' }
  ]

  return (
    <SheetFrame onClose={onClose} labelledBy="guide-title" className="guide-sheet warm-sheet">
      <div className="guide-heading">
        <span>흔적 없는 사용</span>
        <h2 id="guide-title">HAVEN의 안전 가이드</h2>
      </div>
      <div className="guide-list">
        {guides.map(({ icon: Icon, title, copy }) => <div key={title}><span><Icon size={21} /></span><p><strong>{title}</strong><small>{copy}</small></p></div>)}
      </div>
      <button className="primary-action full guide-notice-action" onClick={onOpenNotices}>새 소식 알림 받기</button>
    </SheetFrame>
  )
}

export function NoticeSheet({ notices = [], status, onSubscribe, onClose }) {
  return (
    <SheetFrame onClose={onClose} labelledBy="notice-title" className="notice-sheet">
      <div className="notice-heading">
        <span className="notice-bell" aria-hidden="true"><Bell size={32} /></span>
        <div><span>알림 설정</span><h2 id="notice-title">필요한 소식만 받을게요</h2></div>
      </div>
      {notices.length > 0 ? (
        <div className="notice-list">
          {notices.slice(0, 5).map((notice) => <div className="notification-preview" key={notice.id}><ShieldCheck size={20} /><p><strong>{notice.title}</strong><span>{notice.summary || notice.content}</span></p></div>)}
        </div>
      ) : (
        <div className="notification-preview notice-empty"><p><strong>새 공지사항이 없어요</strong><span>관리자 공지나 긴급 지원 소식이 등록되면 이곳에 표시돼요.</span></p></div>
      )}
      {status && <p className="sheet-warning" role="status">{status}</p>}
      <button className="primary-action full notice-subscribe" onClick={onSubscribe}>새 소식 알림 받기</button>
    </SheetFrame>
  )
}
