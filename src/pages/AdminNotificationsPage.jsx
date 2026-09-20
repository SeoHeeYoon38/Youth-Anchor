import { useState } from 'react'
import { Bell, CheckCircle2, ShieldCheck } from 'lucide-react'
import { enablePushNotifications } from '../api.js'

/**
 * 관리자 기기 등록 화면.
 *
 * HAVEN_ADMIN_KEY는 Vite 번들에 넣지 않고 이 화면에서 직접 입력받아 요청 헤더로만
 * 전송한다. 키는 상태에만 보관하고 localStorage나 URL에는 저장하지 않는다.
 */
export default function AdminNotificationsPage() {
  const [adminKey, setAdminKey] = useState('')
  const [status, setStatus] = useState(null)
  const [registering, setRegistering] = useState(false)

  const registerDevice = async (event) => {
    event.preventDefault()
    const key = adminKey.trim()
    if (!key) {
      setStatus({ tone: 'error', text: '관리자 키를 입력해 주세요.' })
      return
    }

    setRegistering(true)
    setStatus({ tone: 'loading', text: '이 브라우저를 관리자 알림 기기로 등록하고 있어요.' })
    try {
      await enablePushNotifications({ audience: 'admin', adminKey: key })
      setAdminKey('')
      setStatus({ tone: 'success', text: '이 컴퓨터가 관리자 알림 기기로 등록됐어요. 이제 긴급 알림을 받을 수 있어요.' })
    } catch (error) {
      const message = error.message === 'admin-key-required'
        ? '관리자 키가 올바르지 않아요.'
        : error.message === 'push-permission-denied'
          ? '브라우저 알림 권한을 허용해야 해요.'
          : error.message === 'push-not-configured'
            ? '서버의 VAPID 푸시 키 설정이 필요해요.'
            : error.message === 'push-not-supported'
              ? '이 브라우저는 웹 푸시를 지원하지 않아요.'
              : '관리자 기기 등록에 실패했어요. API 서버와 8787 포트를 확인해 주세요.'
      setStatus({ tone: 'error', text: message })
    } finally {
      setRegistering(false)
    }
  }

  return (
    <main className="admin-notification-page">
      <section className="admin-notification-card">
        <div className="admin-notification-icon"><Bell size={27} /></div>
        <span className="section-kicker">Haven 관리자 설정</span>
        <h1>이 컴퓨터를 관리자 기기로 등록</h1>
        <p className="admin-notification-copy">긴급 알림이 발생하면 이 브라우저로 웹 푸시를 보내요. 관리자 키는 저장하지 않고 등록 요청에만 사용합니다.</p>
        <form onSubmit={registerDevice}>
          <label htmlFor="admin-key">관리자 키</label>
          <input
            id="admin-key"
            type="password"
            value={adminKey}
            onChange={(event) => setAdminKey(event.target.value)}
            placeholder=".env의 HAVEN_ADMIN_KEY"
            autoComplete="off"
            disabled={registering}
          />
          <button className="admin-notification-submit" type="submit" disabled={registering}>
            <ShieldCheck size={18} />
            {registering ? '등록 중...' : '관리자 알림 켜기'}
          </button>
        </form>
        {status && <p className={`admin-notification-status ${status.tone}`} role="status">{status.tone === 'success' && <CheckCircle2 size={17} />}{status.text}</p>}
        <p className="admin-notification-note">등록 후 브라우저 알림 권한을 허용하고 이 페이지를 닫지 않아도 알림을 받을 수 있어요. 서버가 실행 중이어야 합니다.</p>
      </section>
    </main>
  )
}
