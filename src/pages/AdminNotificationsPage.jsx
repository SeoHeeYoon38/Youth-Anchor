import { useState } from 'react'
import { BellRing, CheckCircle2, KeyRound, ShieldCheck } from 'lucide-react'
import { enableAdminPushNotifications } from '../api.js'
import Mascot from '../components/Mascot.jsx'

function messageFor(error) {
  if (error.message === 'admin-key-empty') return '관리자 키를 입력해 주세요.'
  if (error.message === 'push-not-configured') return '서버 웹푸시 키 설정이 필요해요.'
  if (error.message === 'push-permission-denied') return '브라우저 알림 권한을 허용해야 해요.'
  if (error.message === 'push-not-supported') return '이 브라우저에서는 웹푸시를 지원하지 않아요.'
  if (error.message === 'admin-key-required' || error.message === 'request-failed-403') return '관리자 키가 맞지 않아요.'
  return '관리자 알림 등록에 실패했어요.'
}

export default function AdminNotificationsPage() {
  const [adminKey, setAdminKey] = useState('')
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    setBusy(true)
    setDone(false)
    setStatus('관리자 기기를 등록하고 있어요.')
    try {
      await enableAdminPushNotifications(adminKey)
      setDone(true)
      setStatus('이 컴퓨터가 관리자 알림 수신 기기로 등록됐어요.')
    } catch (error) {
      setStatus(messageFor(error))
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
            autoComplete="one-time-code"
          />
          <button type="submit" disabled={busy}>
            {done ? <CheckCircle2 size={18} /> : <BellRing size={18} />}
            {busy ? '등록 중' : done ? '등록 완료' : '관리자 알림 켜기'}
          </button>
        </form>

        {status && <p className={`admin-notification-status ${done ? 'success' : ''}`}>{status}</p>}
      </section>
    </main>
  )
}
