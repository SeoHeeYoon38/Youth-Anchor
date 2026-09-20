import { pathToFileURL } from 'node:url'
import { createDatabase } from './database.js'
import { createGeocoder } from './opendata/geocode.js'
import {
  WELFARE_DETAIL_ENDPOINT,
  WELFARE_LIST_ENDPOINT,
  YOUTH_LIFE_CODES,
  fetchWelfareServices
} from './opendata/notices.js'
import { SHELTER_ENDPOINT, fetchYouthShelters } from './opendata/shelters.js'
import { syncNoticeFeeds } from './notice-sync.js'
import { loadSeedNotices, loadSeedShelters } from './seed/index.js'

export const SHELTER_SOURCE = 'mogef-teen-shelter'
const KST_OFFSET_MINUTES = 9 * 60
const DAY_MS = 24 * 60 * 60 * 1000

/**
 * 동기화에 필요한 설정을 환경변수에서 모은다.
 *
 * 공공데이터포털은 서비스 하나당 서비스키를 따로 발급하지 않고 계정 단위 키를 주므로
 * DATA_GO_KR_SERVICE_KEY 하나만 채우면 두 API가 모두 동작한다.
 * 기관별로 키를 분리해 운영할 수도 있어 개별 override를 함께 지원한다.
 */
export function resolveOpenDataConfig(env = process.env) {
  const sharedKey = (env.DATA_GO_KR_SERVICE_KEY || '').trim()
  const shelterKey = (env.HAVEN_SHELTER_API_KEY || sharedKey).trim()
  const welfareKey = (env.HAVEN_WELFARE_API_KEY || sharedKey).trim()
  const lifeCodes = (env.HAVEN_WELFARE_LIFE_CODES || YOUTH_LIFE_CODES.join(','))
    .split(',')
    .map((code) => code.trim())
    .filter(Boolean)

  return {
    shelter: {
      key: shelterKey,
      endpoint: env.HAVEN_SHELTER_ENDPOINT || SHELTER_ENDPOINT,
      numOfRows: Number(env.HAVEN_SHELTER_ROWS || 100),
      maxPages: Number(env.HAVEN_SHELTER_MAX_PAGES || 20),
      enabled: Boolean(shelterKey)
    },
    welfare: {
      key: welfareKey,
      listEndpoint: env.HAVEN_WELFARE_LIST_ENDPOINT || WELFARE_LIST_ENDPOINT,
      detailEndpoint: env.HAVEN_WELFARE_DETAIL_ENDPOINT || WELFARE_DETAIL_ENDPOINT,
      lifeCodes,
      numOfRows: Number(env.HAVEN_WELFARE_ROWS || 100),
      maxPages: Number(env.HAVEN_WELFARE_MAX_PAGES || 10),
      detailLimit: Number(env.HAVEN_WELFARE_DETAIL_LIMIT || 60),
      enabled: Boolean(welfareKey)
    },
    noticeFeedUrls: env.HAVEN_NOTICE_FEED_URLS || '',
    scheduleHourKst: Number(env.HAVEN_SYNC_HOUR_KST ?? 4),
    scheduleMinuteKst: Number(env.HAVEN_SYNC_MINUTE_KST ?? 10)
  }
}

function summarize(target, startedAt, extra = {}) {
  return {
    target,
    status: extra.status || 'ok',
    imported: extra.imported || 0,
    skipped: extra.skipped || 0,
    totalCount: extra.totalCount || 0,
    message: extra.message || '',
    startedAt,
    finishedAt: new Date().toISOString()
  }
}

/**
 * 전국 청소년쉼터를 내려받아 DB에 upsert한다.
 * 좌표가 빠진 행은 카카오 지오코딩으로 보정하고, 그래도 없으면 건너뛴다(지도에 찍을 수 없으므로).
 */
export async function syncShelters({
  repository,
  config = resolveOpenDataConfig(),
  geocoder = createGeocoder(),
  fetchImpl = fetch,
  logger = console
} = {}) {
  const startedAt = new Date().toISOString()
  const settings = config.shelter

  if (!settings.enabled) {
    return summarize('shelters', startedAt, {
      status: 'skipped',
      message: 'DATA_GO_KR_SERVICE_KEY가 없어 청소년쉼터 동기화를 건너뜁니다.'
    })
  }

  try {
    const { items, totalCount, skipped } = await fetchYouthShelters({
      serviceKey: settings.key,
      endpoint: settings.endpoint,
      numOfRows: settings.numOfRows,
      maxPages: settings.maxPages,
      fetchImpl
    })

    let imported = 0
    let withoutCoordinates = 0

    for (const shelter of items) {
      let { lat, lng } = shelter
      if (lat === null || lng === null) {
        const located = await geocoder.geocode(shelter.address, shelter.name)
        lat = located?.lat ?? null
        lng = located?.lng ?? null
      }
      if (lat === null || lng === null) {
        withoutCoordinates += 1
        continue
      }
      repository.upsertShelter({ ...shelter, lat, lng })
      imported += 1
    }

    // 오픈API가 더 최신이므로 동봉 파일데이터로 넣어둔 행은 정리한다.
    if (imported > 0) repository.deleteSheltersExceptSource(SHELTER_SOURCE)

    const message = withoutCoordinates > 0 ? `좌표 없음 ${withoutCoordinates}건 제외` : ''
    logger.log?.(`[sync] shelters imported=${imported} total=${totalCount} ${message}`)
    return summarize('shelters', startedAt, {
      imported,
      skipped: skipped + withoutCoordinates,
      totalCount,
      message
    })
  } catch (error) {
    logger.error?.(`[sync] shelters failed: ${error.message}`)
    return summarize('shelters', startedAt, { status: 'error', message: error.message })
  }
}

/**
 * 중앙부처 복지서비스와 추가 JSON 피드를 공지/지원 목록으로 모은다.
 */
export async function syncSupportNotices({
  repository,
  config = resolveOpenDataConfig(),
  fetchImpl = fetch,
  logger = console
} = {}) {
  const startedAt = new Date().toISOString()
  const messages = []
  let imported = 0
  let totalCount = 0
  let status = 'ok'

  if (config.welfare.enabled) {
    try {
      const result = await fetchWelfareServices({
        serviceKey: config.welfare.key,
        listEndpoint: config.welfare.listEndpoint,
        detailEndpoint: config.welfare.detailEndpoint,
        lifeCodes: config.welfare.lifeCodes,
        numOfRows: config.welfare.numOfRows,
        maxPages: config.welfare.maxPages,
        detailLimit: config.welfare.detailLimit,
        fetchImpl
      })
      for (const notice of result.items) {
        repository.upsertNotice(notice)
        imported += 1
      }
      totalCount += result.totalCount
      if (result.detailErrors.length > 0) messages.push(`상세 조회 실패 ${result.detailErrors.length}건`)
    } catch (error) {
      status = 'error'
      messages.push(`중앙부처복지서비스: ${error.message}`)
      logger.error?.(`[sync] welfare failed: ${error.message}`)
    }
  } else {
    messages.push('DATA_GO_KR_SERVICE_KEY가 없어 복지서비스 동기화를 건너뜁니다.')
    status = 'skipped'
  }

  if (config.noticeFeedUrls) {
    const feedResult = await syncNoticeFeeds(repository, config.noticeFeedUrls)
    imported += feedResult.imported
    if (feedResult.errors.length > 0) messages.push(`추가 피드 실패 ${feedResult.errors.length}건`)
  }

  if (imported > 0 && status === 'skipped') status = 'ok'
  logger.log?.(`[sync] notices imported=${imported}`)
  return summarize('notices', startedAt, { status, imported, totalCount, message: messages.join(' / ') })
}

/**
 * DB가 비어 있으면 동봉된 전국 청소년쉼터 실데이터를 먼저 넣는다.
 *
 * 여성가족부 파일데이터 기반이라 서비스키가 없어도 첫 실행부터 실제 쉼터가 보인다.
 * 서비스키가 있는 환경에서도 오픈API 응답을 기다리는 동안 화면이 비지 않도록 항상 넣고,
 * 이후 동기화가 성공하면 더 최신인 오픈API 데이터로 교체된다.
 */
export async function ensureBaselineData({ repository, logger = console } = {}) {
  let sheltersInserted = 0
  let noticesInserted = 0

  if (repository.countShelters() === 0) {
    const shelters = await loadSeedShelters()
    for (const shelter of shelters) repository.upsertShelter(shelter)
    sheltersInserted = shelters.length
    logger.log?.(`[sync] 전국 청소년쉼터 ${shelters.length}곳을 동봉 데이터로 채웠습니다 (여성가족부 2025-03 기준)`)
  }

  if (repository.countNotices() === 0) {
    const notices = await loadSeedNotices()
    for (const notice of notices) repository.upsertNotice(notice)
    noticesInserted = notices.length
    logger.log?.(`[sync] 복지서비스 ${notices.length}건을 마지막 정상 수집 데이터로 채웠습니다`)
  }

  return {
    inserted: sheltersInserted + noticesInserted,
    sheltersInserted,
    noticesInserted,
    reason: sheltersInserted || noticesInserted ? 'seeded' : 'already-populated'
  }
}

/** 쉼터·공지 동기화를 함께 실행하고 결과를 sync_runs에 기록한다. */
export async function syncAll({
  repository,
  config = resolveOpenDataConfig(),
  targets = ['shelters', 'notices'],
  fetchImpl = fetch,
  geocoder = createGeocoder(),
  logger = console
} = {}) {
  const runs = []

  if (targets.includes('shelters')) {
    runs.push(await syncShelters({ repository, config, geocoder, fetchImpl, logger }))
  }
  if (targets.includes('notices')) {
    runs.push(await syncSupportNotices({ repository, config, fetchImpl, logger }))
  }

  for (const run of runs) repository.recordSyncRun(run)

  return {
    runs,
    shelters: repository.countShelters(),
    notices: repository.countNotices(),
    finishedAt: new Date().toISOString()
  }
}

/** 다음 한국시간 기준 실행 시각까지 남은 밀리초를 구한다. */
export function millisecondsUntilNextRun(hourKst, minuteKst, now = new Date()) {
  const kstNow = new Date(now.getTime() + KST_OFFSET_MINUTES * 60 * 1000)
  const target = new Date(kstNow)
  target.setUTCHours(hourKst, minuteKst, 0, 0)
  if (target <= kstNow) target.setTime(target.getTime() + DAY_MS)
  return target.getTime() - kstNow.getTime()
}

/**
 * 매일 한국시간 새벽에 동기화를 실행하는 타이머를 건다.
 * 서버가 죽지 않고 계속 뜨는 환경(예: 단일 노드 배포)을 전제로 한 경량 스케줄러다.
 */
export function startSyncScheduler({
  repository,
  config = resolveOpenDataConfig(),
  logger = console,
  runOnStart = true
} = {}) {
  let timer = null
  let stopped = false

  const run = async () => {
    try {
      await syncAll({ repository, config, logger })
    } catch (error) {
      logger.error?.(`[sync] scheduled run failed: ${error.message}`)
    }
  }

  const schedule = () => {
    if (stopped) return
    const delay = millisecondsUntilNextRun(config.scheduleHourKst, config.scheduleMinuteKst)
    timer = setTimeout(async () => {
      await run()
      schedule()
    }, delay)
    timer.unref?.()
    logger.log?.(`[sync] next scheduled run in ${Math.round(delay / 60000)} minutes (KST ${config.scheduleHourKst}:${String(config.scheduleMinuteKst).padStart(2, '0')})`)
  }

  if (runOnStart && (config.shelter.enabled || config.welfare.enabled)) {
    run().catch(() => {})
  }
  schedule()

  return {
    stop() {
      stopped = true
      if (timer) clearTimeout(timer)
    },
    runNow: run
  }
}

const isMainModule = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href

if (isMainModule) {
  const requested = process.argv.slice(2).filter((arg) => !arg.startsWith('-'))
  const targets = requested.length > 0 ? requested : ['shelters', 'notices']
  const repository = createDatabase()
  const config = resolveOpenDataConfig()

  if (!config.shelter.enabled && !config.welfare.enabled) {
    console.error('DATA_GO_KR_SERVICE_KEY가 설정되지 않았습니다. .env에 공공데이터포털 일반 인증키를 넣어주세요.')
  }

  try {
    const result = await syncAll({ repository, config, targets })
    console.log(JSON.stringify(result, null, 2))
    const failed = result.runs.some((run) => run.status === 'error')
    process.exitCode = failed ? 1 : 0
  } finally {
    repository.close()
  }
}
