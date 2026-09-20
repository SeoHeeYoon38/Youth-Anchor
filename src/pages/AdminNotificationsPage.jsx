import { useState } from 'react'
import { BellRing, CheckCircle2, KeyRound, ShieldCheck } from 'lucide-react'
import { enablePushNotifications } from '../api.js'
import Mascot from '../components/Mascot.jsx'

export default function AdminNotificationsPage() {
  const [adminKey, setAdminKey] = useState('')
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    const key = adminKey.trim()
    
    if (!key) {
      setStatus('관리자 키를 입력해 주세요.')
      return
    }

    setBusy(true)
    setDone(false)
    setStatus('이 브라우저를 관리자 알림 기기로 등록하고 있어요.')
    
    try {
      // 원격 저장소의 최신 API 규격 반영
      await enablePushNotifications({ audience: 'admin', adminKey: key })
      setDone(true)
      setStatus('이 컴퓨터가 관리자 알림 수신 기기로 등록됐어요.')
      setAdminKey('')
    } catch (error) {
      const message = error.message === 'admin-key-required' || error.message === 'request-failed-403'
        ? '관리자 키가 올바르지 않아요.'
        : error.message === 'push-permission-denied'
          ? '브라우저 알림 권한을 허용해야 해요.'
          : error.message === 'push-not-configured'
            ? '서버의 VAPID 푸시 키 설정이 필요해요.'
            : error.message === 'push-not-supported'
              ? '이 브라우저는 웹 푸시를 지원하지 않아요.'
              : '관리자 기기 등록에 실패했어요.'
      setStatus(message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="admin-notification-page">
      <section className="admin-notification-card page-enter">
        <div className="admin-notification-hero">
          <Mascot pose="secure" className="mascot-breathe" alt="관리자 알림을 지키는 가온" />
          <div>
            <span><ShieldCheck size={16} /> 관리자 알림 등록</span>
            <h1>이 컴퓨터로 SOS를 받을게요.</h1>
            <p>시연용 관리자 PC에서만 직접 접속해 등록하는 숨은 설정 화면이에요.</p>
          </div>
        </div>

        <form className="admin-notification-form" onSubmit={submit}>
          <label htmlFor="admin-key"><KeyRound size={16} /> 관리자 키</label>
          <input
            id="admin-key"
            type="password"
            value={adminKey}
            onChange={(event) => setAdminKey(event.target.value)}
            placeholder="관리자 키 입력"
            autoComplete="off"
            disabled={busy}
          />
          <button type="submit" disabled={busy}>
            {done ? <CheckCircle2 size={18} /> : <BellRing size={18} />}
            {busy ? '등록 중...' : done ? '등록 완료' : '관리자 알림 켜기'}
          </button>
        </form>

        {status && <p className={`admin-notification-status ${done ? 'success' : 'error'}`}>{status}</p>}
      </section>
    </main>
  )
}