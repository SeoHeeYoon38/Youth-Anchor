function normalizeNotice(item, sourceUrl) {
  const title = item.title || item.name || item.subject
  if (!title) return null
  return {
    externalId: String(item.id || item.noticeId || item.seq || title),
    kind: item.kind || 'support',
    category: item.category || item.type || '기타',
    title,
    summary: item.summary || item.description || '',
    content: item.content || item.body || item.description || '',
    eligibility: item.eligibility || item.requirements || [],
    benefits: item.benefits || [],
    tags: item.tags || [],
    applicationUrl: item.applicationUrl || item.applyUrl || item.url || null,
    provider: item.provider || item.organization || '',
    deadline: item.deadline || item.applicationPeriod || '',
    sourceUrl,
    publishedAt: item.publishedAt || item.createdAt || new Date().toISOString()
  }
}

export async function syncNoticeFeeds(repository, feedUrls = process.env.HAVEN_NOTICE_FEED_URLS || '') {
  const urls = feedUrls.split(',').map((value) => value.trim()).filter(Boolean)
  const result = { feeds: urls.length, imported: 0, errors: [] }

  for (const sourceUrl of urls) {
    try {
      const response = await fetch(sourceUrl, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(10_000) })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const payload = await response.json()
      const items = Array.isArray(payload) ? payload : payload.items || payload.data || payload.results || []
      for (const item of items) {
        const notice = normalizeNotice(item, sourceUrl)
        if (notice) {
          repository.upsertNotice(notice)
          result.imported += 1
        }
      }
    } catch (error) {
      result.errors.push({ sourceUrl, message: error.message })
    }
  }

  return result
}
