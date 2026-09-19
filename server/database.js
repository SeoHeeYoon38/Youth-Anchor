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
    features: parseJson(row.features)
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
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
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
  `)

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
        application_url, provider, deadline, source_url, published_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        deadline = excluded.deadline,
        published_at = excluded.published_at,
        updated_at = excluded.updated_at
    `),
    listShelters: database.prepare('SELECT * FROM shelters ORDER BY id'),
    getShelter: database.prepare('SELECT * FROM shelters WHERE id = ?'),
    createShelter: database.prepare(`
      INSERT INTO shelters (
        external_id, name, type, gender, ages, lat, lng, address, phone, open_hours,
        features, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      const result = statements.createShelter.run(
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
        now,
        now
      )
      return this.getShelter(Number(result.lastInsertRowid))
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
