import webPush from 'web-push'

export function createPushService(repository, config = {}) {
  const publicKey = config.publicKey || process.env.VAPID_PUBLIC_KEY
  const privateKey = config.privateKey || process.env.VAPID_PRIVATE_KEY
  const subject = config.subject || process.env.VAPID_SUBJECT || 'mailto:admin@example.com'
  const configured = Boolean(publicKey && privateKey)

  if (configured) webPush.setVapidDetails(subject, publicKey, privateKey)

  return {
    publicKey: publicKey || null,
    async sendToAudience(audience, payload) {
      if (!configured) return { configured: false, delivered: 0, failed: 0 }
      const subscriptions = repository.listSubscriptions(audience)
      let delivered = 0
      let failed = 0
      await Promise.all(subscriptions.map(async (subscription) => {
        try {
          await webPush.sendNotification({
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth }
          }, JSON.stringify(payload))
          delivered += 1
        } catch (error) {
          failed += 1
          if (error.statusCode === 404 || error.statusCode === 410) repository.deleteSubscription(subscription.endpoint)
        }
      }))
      return { configured: true, delivered, failed }
    }
  }
}
