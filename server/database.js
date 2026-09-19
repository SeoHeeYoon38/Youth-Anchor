import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { DatabaseSync } from 'node:sqlite'

const DEFAULT_DATABASE_PATH = resolve('server/data/haven.db')

function parseJson(value, fallback = []) {
  try {
    return value ? JSON.parse(value) : fallback
  } catch {
    return fallback
  }
}

function mapNotice(row) {
  if (!row) return null
  return {
    id: row.id,
    kind: row.kind,
    category: row.category,
    title: row.title,
    summary: row.summary,
    content: row.content,
    eligibility: parseJson(row.eligibility),
    benefits: parseJson(row.benefits),
    tags: parseJson(row.tags),
    applicationUrl: row.application_url,
    provider: row.provider,
    contact: row.contact || '',
    deadline: row.deadline,
    sourceUrl: row.source_url,
    publishedAt: row.published_at,
    updatedAt: row.updated_at
  }
}

function mapShelter(row) {
  if (!row) return null
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    gender: row.gender,
    ages: row.ages,
    lat: row.lat,
    lng: row.lng,
    address: row.address,
    phone: row.phone,
    open: row.open_hours,
    features: parseJson(row.features),
    capacity: row.capacity ?? null,
    region: row.region || '',
    homepage: row.homepage || null,
    entryTarget: row.entry_target || '',
    entryPeriod: row.entry_period || '',
    source: row.source || 'seed'
  }
}

/** createShelter와 upsertShelter가 같은 컬럼 순서를 공유하도록 값 배열을 만든다. */
function shelterValues(shelter, now) {
  return [
    shelter.externalId || null,
    shelter.name,
    shelter.type,
    shelter.gender || '누구나',
    shelter.ages || '',
    shelter.lat,
    shelter.lng,
    shelter.address,
    shelter.phone || '1388',
    shelter.open || '',
    JSON.stringify(shelter.features || []),
    Number.isFinite(shelter.capacity) ? shelter.capacity : null,
    shelter.region || '',
    shelter.homepage || null,
    shelter.entryTarget || '',
    shelter.entryPeriod || '',
    shelter.source || 'seed',
    now,
    now
  ]
}

/**
 * 이미 만들어진 데이터베이스 파일에도 새 컬럼을 안전하게 더한다.
 * node:sqlite에는 마이그레이션 도구가 없어 PRAGMA로 존재 여부를 직접 확인한다.
 */
function ensureColumns(database, table, columns) {
  const existing = new Set(database.prepare(`PRAGMA table_info(${table})`).all().map((row) => row.name))
  for (const [name, definition] of Object.entries(columns)) {
    if (existing.has(name)) continue
    database.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${definition}`)
  }
}

export function createDatabase(databasePath = process.env.HAVEN_DB_PATH || DEFAULT_DATABASE_PATH) {
  if (databasePath !== ':memory:') mkdirSync(dirname(databasePath), { recursive: true })

  const database = new DatabaseSync(databasePath)
  database.exec('PRAGMA foreign_keys = ON')
  if (databasePath !== ':memory:') database.exec('PRAGMA journal_mode = WAL')

  database.exec(`
    CREATE TABLE IF NOT EXISTS notices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      external_id TEXT,
      kind TEXT NOT NULL DEFAULT 'support',
      category TEXT NOT NULL DEFAULT '기타',
      title TEXT NOT NULL,
      summary TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL DEFAULT '',
      eligibility TEXT NOT NULL DEFAULT '[]',
      benefits TEXT NOT NULL DEFAULT '[]',
      tags TEXT NOT NULL DEFAULT '[]',
      application_url TEXT,
      provider TEXT NOT NULL DEFAULT '',
      contact TEXT NOT NULL DEFAULT '',
      deadline TEXT NOT NULL DEFAULT '',
      source_url TEXT,
      published_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(source_url, external_id)
    );

    CREATE TABLE IF NOT EXISTS shelters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      external_id TEXT UNIQUE,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      gender TEXT NOT NULL DEFAULT '누구나',
      ages TEXT NOT NULL DEFAULT '',
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      address TEXT NOT NULL,
      phone TEXT NOT NULL DEFAULT '1388',
      open_hours TEXT NOT NULL DEFAULT '',
      features TEXT NOT NULL DEFAULT '[]',
      capacity INTEGER,
      region TEXT NOT NULL DEFAULT '',
      homepage TEXT,
      entry_target TEXT NOT NULL DEFAULT '',
      entry_period TEXT NOT NULL DEFAULT '',
      source TEXT NOT NULL DEFAULT 'seed',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sync_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      target TEXT NOT NULL,
      status TEXT NOT NULL,
      imported INTEGER NOT NULL DEFAULT 0,
      skipped INTEGER NOT NULL DEFAULT 0,
      total_count INTEGER NOT NULL DEFAULT 0,
      message TEXT NOT NULL DEFAULT '',
      started_at TEXT NOT NULL,
      finished_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS guest_sessions (
      jti TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      revoked_at TEXT
    );

    CREATE TABLE IF NOT EXISTS chat_rooms (
      id TEXT PRIMARY KEY,
      guest_jti TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'waiting',
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      deleted_at TEXT,
      FOREIGN KEY (guest_jti) REFERENCES guest_sessions(jti) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (room_id) REFERENCES chat_rooms(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS sos_alerts (
      id TEXT PRIMARY KEY,
      guest_jti TEXT NOT NULL,
      room_id TEXT,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      message TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'received',
      created_at TEXT NOT NULL,
      FOREIGN KEY (guest_jti) REFERENCES guest_sessions(jti) ON DELETE CASCADE,
      FOREIGN KEY (room_id) REFERENCES chat_rooms(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guest_jti TEXT,
      endpoint TEXT NOT NULL UNIQUE,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      audience TEXT NOT NULL DEFAULT 'guest',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (guest_jti) REFERENCES guest_sessions(jti) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_notices_category ON notices(category);
    CREATE INDEX IF NOT EXISTS idx_shelters_coordinates ON shelters(lat, lng);
    CREATE INDEX IF NOT EXISTS idx_chat_rooms_guest ON chat_rooms(guest_jti);
    CREATE INDEX IF NOT EXISTS idx_push_audience ON push_subscriptions(audience);
    CREATE INDEX IF NOT EXISTS idx_sync_runs_target ON sync_runs(target, finished_at);
  `)

  ensureColumns(database, 'notices', { contact: "TEXT NOT NULL DEFAULT ''" })
  ensureColumns(database, 'shelters', {
    capacity: 'INTEGER',
    region: "TEXT NOT NULL DEFAULT ''",
    homepage: 'TEXT',
    entry_target: "TEXT NOT NULL DEFAULT ''",
    entry_period: "TEXT NOT NULL DEFAULT ''",
    source: "TEXT NOT NULL DEFAULT 'seed'"
  })

  const statements = {
    listNotices: database.prepare(`
      SELECT * FROM notices
      WHERE (? IS NULL OR category = ?) AND (? IS NULL OR kind = ?)
      ORDER BY published_at DESC, id DESC
      LIMIT ? OFFSET ?
    `),
    getNotice: database.prepare('SELECT * FROM notices WHERE id = ?'),
    getNoticeBySource: database.prepare('SELECT * FROM notices WHERE source_url = ? AND external_id = ?'),
    upsertNotice: database.prepare(`
      INSERT INTO notices (
        external_id, kind, category, title, summary, content, eligibility, benefits, tags,
        application_url, provider, contact, deadline, source_url, published_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(source_url, external_id) DO UPDATE SET
        kind = excluded.kind,
        category = excluded.category,
        title = excluded.title,
        summary = excluded.summary,
        content = excluded.content,
        eligibility = excluded.eligibility,
        benefits = excluded.benefits,
        tags = excluded.tags,
        application_url = excluded.application_url,
        provider = excluded.provider,
        contact = excluded.contact,
        deadline = excluded.deadline,
        published_at = excluded.published_at,
        updated_at = excluded.updated_at
    `),
    listShelters: database.prepare('SELECT * FROM shelters ORDER BY id'),
    getShelter: database.prepare('SELECT * FROM shelters WHERE id = ?'),
    createShelter: database.prepare(`
      INSERT INTO shelters (
        external_id, name, type, gender, ages, lat, lng, address, phone, open_hours,
        features, capacity, region, homepage, entry_target, entry_period, source,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `),
    upsertShelter: database.prepare(`
      INSERT INTO shelters (
        external_id, name, type, gender, ages, lat, lng, address, phone, open_hours,
        features, capacity, region, homepage, entry_target, entry_period, source,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(external_id) DO UPDATE SET
        name = excluded.name,
        type = excluded.type,
        gender = excluded.gender,
        ages = excluded.ages,
        lat = excluded.lat,
        lng = excluded.lng,
        address = excluded.address,
        phone = excluded.phone,
        open_hours = excluded.open_hours,
        features = excluded.features,
        capacity = excluded.capacity,
        region = excluded.region,
        homepage = excluded.homepage,
        entry_target = excluded.entry_target,
        entry_period = excluded.entry_period,
        source = excluded.source,
        updated_at = excluded.updated_at
    `),
    getShelterByExternalId: database.prepare('SELECT * FROM shelters WHERE external_id = ?'),
    countShelters: database.prepare('SELECT COUNT(*) AS total FROM shelters'),
    countNotices: database.prepare('SELECT COUNT(*) AS total FROM notices'),
    deleteSheltersBySource: database.prepare('DELETE FROM shelters WHERE source = ?'),
    deleteSheltersExceptSource: database.prepare('DELETE FROM shelters WHERE source <> ?'),
    recordSyncRun: database.prepare(`
      INSERT INTO sync_runs (target, status, imported, skipped, total_count, message, started_at, finished_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `),
    latestSyncRuns: database.prepare(`
      SELECT * FROM sync_runs WHERE id IN (
        SELECT MAX(id) FROM sync_runs GROUP BY target
      ) ORDER BY target
    `),
    createGuest: database.prepare('INSERT INTO guest_sessions (jti, created_at, expires_at) VALUES (?, ?, ?)'),
    getGuest: database.prepare('SELECT * FROM guest_sessions WHERE jti = ?'),
    createChatRoom: database.prepare('INSERT INTO chat_rooms (id, guest_jti, created_at, expires_at) VALUES (?, ?, ?, ?)'),
    getChatRoom: database.prepare('SELECT * FROM chat_rooms WHERE id = ? AND deleted_at IS NULL'),
    activateChatRoom: database.prepare("UPDATE chat_rooms SET status = 'active' WHERE id = ? AND deleted_at IS NULL"),
    createMessage: database.prepare('INSERT INTO chat_messages (room_id, role, content, created_at) VALUES (?, ?, ?, ?)'),
    deleteMessages: database.prepare('DELETE FROM chat_messages WHERE room_id = ?'),
    deleteSosByRoom: database.prepare('DELETE FROM sos_alerts WHERE room_id = ?'),
    deleteRoom: database.prepare('DELETE FROM chat_rooms WHERE id = ?'),
    createSos: database.prepare('INSERT INTO sos_alerts (id, guest_jti, room_id, lat, lng, message, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'),
    upsertSubscription: database.prepare(`
      INSERT INTO push_subscriptions (guest_jti, endpoint, p256dh, auth, audience, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(endpoint) DO UPDATE SET
        guest_jti = excluded.guest_jti,
        p256dh = excluded.p256dh,
        auth = excluded.auth,
        audience = excluded.audience,
        updated_at = excluded.updated_at
    `),
    subscriptionsByAudience: database.prepare('SELECT * FROM push_subscriptions WHERE audience = ?'),
    deleteSubscription: database.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?'),
    purgeExpiredGuests: database.prepare('DELETE FROM guest_sessions WHERE expires_at <= ? OR revoked_at IS NOT NULL')
  }

  return {
    close: () => database.close(),
    listNotices({ category = null, kind = null, limit = 50, offset = 0 } = {}) {
      return statements.listNotices.all(category, category, kind, kind, limit, offset).map(mapNotice)
    },
    getNotice(id) {
      return mapNotice(statements.getNotice.get(id))
    },
    upsertNotice(notice) {
      const now = new Date().toISOString()
      statements.upsertNotice.run(
        notice.externalId || null,
        notice.kind || 'support',
        notice.category || '기타',
        notice.title,
        notice.summary || '',
        notice.content || '',
        JSON.stringify(notice.eligibility || []),
        JSON.stringify(notice.benefits || []),
        JSON.stringify(notice.tags || []),
        notice.applicationUrl || null,
        notice.provider || '',
        notice.contact || '',
        notice.deadline || '',
        notice.sourceUrl || null,
        notice.publishedAt || now,
        now
      )
      return mapNotice(statements.getNoticeBySource.get(notice.sourceUrl || null, notice.externalId || null))
    },
    listShelters() {
      return statements.listShelters.all().map(mapShelter)
    },
    getShelter(id) {
      return mapShelter(statements.getShelter.get(id))
    },
    createShelter(shelter) {
      const now = new Date().toISOString()
      const result = statements.createShelter.run(...shelterValues(shelter, now))
      return this.getShelter(Number(result.lastInsertRowid))
    },
    /** external_id 기준으로 새로 넣거나 갱신한다. 동기화 배치가 반복 실행돼도 중복되지 않는다. */
    upsertShelter(shelter) {
      if (!shelter.externalId) throw new Error('shelter-external-id-required')
      const now = new Date().toISOString()
      statements.upsertShelter.run(...shelterValues(shelter, now))
      return mapShelter(statements.getShelterByExternalId.get(shelter.externalId))
    },
    countShelters() {
      return Number(statements.countShelters.get()?.total || 0)
    },
    countNotices() {
      return Number(statements.countNotices.get()?.total || 0)
    },
    deleteSheltersBySource(source) {
      return statements.deleteSheltersBySource.run(source).changes
    },
    /** 오픈API 동기화 성공 후 다른 출처(동봉 파일데이터 등)의 행을 정리한다. */
    deleteSheltersExceptSource(source) {
      return statements.deleteSheltersExceptSource.run(source).changes
    },
    recordSyncRun(run) {
      statements.recordSyncRun.run(
        run.target,
        run.status,
        run.imported || 0,
        run.skipped || 0,
        run.totalCount || 0,
        run.message || '',
        run.startedAt,
        run.finishedAt || new Date().toISOString()
      )
    },
    latestSyncRuns() {
      return statements.latestSyncRuns.all().map((row) => ({
        target: row.target,
        status: row.status,
        imported: row.imported,
        skipped: row.skipped,
        totalCount: row.total_count,
        message: row.message,
        startedAt: row.started_at,
        finishedAt: row.finished_at
      }))
    },
    createGuest(jti, createdAt, expiresAt) {
      statements.createGuest.run(jti, createdAt, expiresAt)
    },
    getGuest(jti) {
      return statements.getGuest.get(jti) || null
    },
    createChatRoom(id, guestJti, createdAt, expiresAt) {
      statements.createChatRoom.run(id, guestJti, createdAt, expiresAt)
      return statements.getChatRoom.get(id)
    },
    getChatRoom(id) {
      return statements.getChatRoom.get(id) || null
    },
    activateChatRoom(id) {
      statements.activateChatRoom.run(id)
    },
    addMessage(roomId, role, content) {
      statements.createMessage.run(roomId, role, content, new Date().toISOString())
    },
    deleteChatRoom(id, guestJti) {
      const room = this.getChatRoom(id)
      if (!room || room.guest_jti !== guestJti) return false
      database.exec('BEGIN IMMEDIATE')
      try {
        statements.deleteMessages.run(id)
        statements.deleteSosByRoom.run(id)
        statements.deleteRoom.run(id)
        database.exec('COMMIT')
        return true
      } catch (error) {
        database.exec('ROLLBACK')
        throw error
      }
    },
    createSos(alert) {
      statements.createSos.run(alert.id, alert.guestJti, alert.roomId || null, alert.lat, alert.lng, alert.message || '', alert.createdAt)
      return alert
    },
    upsertSubscription(subscription) {
      const now = new Date().toISOString()
      statements.upsertSubscription.run(
        subscription.guestJti || null,
        subscription.endpoint,
        subscription.keys.p256dh,
        subscription.keys.auth,
        subscription.audience || 'guest',
        now,
        now
      )
    },
    listSubscriptions(audience) {
      return statements.subscriptionsByAudience.all(audience)
    },
    deleteSubscription(endpoint) {
      statements.deleteSubscription.run(endpoint)
    },
    purgeExpired(now = new Date().toISOString()) {
      return statements.purgeExpiredGuests.run(now).changes
    }
  }
}
