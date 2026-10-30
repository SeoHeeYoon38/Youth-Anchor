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
import { useState } from 'react'
import { buildKakaoDirectionsUrl, requestCurrentPosition } from '../kakaoDirections.js'

function SheetFrame({ children, onClose, labelledBy, className = '' }) {
  return (
    <div className="sheet-backdrop" role="presentation" onMouseDown={onClose}>
      <section className={`bottom-sheet ${className}`} role="dialog" aria-modal="true" aria-labelledby={labelledBy} onMouseDown={(event) => event.stopPropagation()}>
        <div className="sheet-handle" />
        {children}
      </section>
    </div>
  )
}

export function ShelterSheet({ shelter, origin = null, originName = '현재 위치', onClose }) {
  const [addressVisible, setAddressVisible] = useState(false)
  const [routePending, setRoutePending] = useState(false)
  const mapUrl = buildKakaoDirectionsUrl({ shelter, origin, originName })

  const openDirections = (event) => {
    event.preventDefault()
    if (routePending) return

    setRoutePending(true)
    const navigateToKakaoMap = (routeOrigin, routeOriginName) => {
      const url = buildKakaoDirectionsUrl({ shelter, origin: routeOrigin, originName: routeOriginName })
      setRoutePending(false)
      window.location.assign(url)
    }

    requestCurrentPosition(navigator.geolocation)
      .then((currentPosition) => navigateToKakaoMap(currentPosition, '현재 위치'))
      .catch(() => navigateToKakaoMap(origin, originName))
  }
  // 공공데이터에서 대표전화를 받아오면 그 번호로 걸고, 없으면 청소년전화 1388로 안내한다.
  const phone = shelter.phone || '1388'
  const dialNumber = phone.replace(/[^0-9+]/g, '') || '1388'
  return (
    <SheetFrame onClose={onClose} labelledBy="shelter-sheet-title" className="shelter-sheet warm-sheet">
      <div className="sheet-title-row">
        <span className="sheet-place-icon"><img src="/figma/warm/map-shelter.svg" alt="" aria-hidden="true" /></span>
        <div className="shelter-title-copy">
          <span className="section-kicker">안전 공간 정보</span>
          <button
            className={`shelter-title-trigger ${addressVisible ? 'address-visible' : ''}`}
            type="button"
            aria-expanded={addressVisible}
            aria-describedby="shelter-sheet-address"
            onClick={() => setAddressVisible((visible) => !visible)}
          >
            <h2 id="shelter-sheet-title">{shelter.name}</h2>
            <span className="shelter-title-tags">{shelter.features.slice(0, 3).map((feature) => `#${feature}`).join(' ')}</span>
            <span className="sheet-address-popover" id="shelter-sheet-address" role="tooltip">{shelter.address}</span>
          </button>
        </div>
      </div>
      <div className="sheet-facts">
        <div><span>이용 대상</span><strong>{shelter.gender}<br />{shelter.ages}</strong></div>
        <div><span>운영 시간</span><strong>{shelter.open}</strong></div>
        <div><span>입소 문의</span><strong>{phone}</strong></div>
      </div>
      <p className="sheet-warning shelter-warning">출발 전 전화로 입소 가능 여부를 다시 확인해 주세요. 연결이 어렵다면 청소년전화 1388을 이용하세요.</p>
      <div className="sheet-actions">
        <a className="secondary-action" href={`tel:${dialNumber}`}><Phone size={18} /> 전화 확인</a>
        <a className="primary-action" href={mapUrl} onClick={openDirections} aria-busy={routePending}>
          <Navigation size={18} /> {routePending ? '현재 위치 확인 중' : '경로 안내받기'}
        </a>
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
