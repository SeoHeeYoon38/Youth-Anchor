self.addEventListener('push', (event) => {
  const payload = event.data?.json?.() || {}
  const title = payload.type === 'sos' ? 'Haven 긴급 알림' : payload.title || 'Haven 새 소식'
  const body = payload.type === 'sos' ? '긴급 도움 요청이 접수되었습니다.' : payload.body || '새로운 지원 정보를 확인해 주세요.'
  event.waitUntil(self.registration.showNotification(title, {
    body,
    icon: '/haven-mark.svg',
    badge: '/haven-mark.svg',
    data: payload
  }))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(self.clients.openWindow('/'))
})
