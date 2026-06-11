-- ============================================================
-- ChatWave SQLite Schema
-- ============================================================

DROP TABLE IF EXISTS cw_reports;
DROP TABLE IF EXISTS cw_status_views;
DROP TABLE IF EXISTS cw_statuses;
DROP TABLE IF EXISTS cw_message_reactions;
DROP TABLE IF EXISTS cw_message_status;
DROP TABLE IF EXISTS cw_messages;
DROP TABLE IF EXISTS cw_community_groups;
DROP TABLE IF EXISTS cw_community_members;
DROP TABLE IF EXISTS cw_communities;
DROP TABLE IF EXISTS cw_group_members;
DROP TABLE IF EXISTS cw_groups;
DROP TABLE IF EXISTS cw_chat_participants;
DROP TABLE IF EXISTS cw_calls;
DROP TABLE IF EXISTS cw_blocked_users;
DROP TABLE IF EXISTS cw_otps;
DROP TABLE IF EXISTS cw_devices;
DROP TABLE IF EXISTS cw_chats;
DROP TABLE IF EXISTS cw_users;

-- ── Users ────────────────────────────────────────────────────
CREATE TABLE cw_users (
  id            TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  phone         TEXT UNIQUE,
  email         TEXT UNIQUE,
  password_hash TEXT,
  name          TEXT NOT NULL,
  about         TEXT DEFAULT 'Hey there! I am using ChatWave.',
  avatar_url    TEXT,
  is_online     INTEGER DEFAULT 0,
  last_seen     DATETIME DEFAULT CURRENT_TIMESTAMP,
  role          TEXT DEFAULT 'user',
  two_fa_enabled INTEGER DEFAULT 0,
  push_token    TEXT,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ── OTPs ─────────────────────────────────────────────────────
CREATE TABLE cw_otps (
  id         TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  phone      TEXT NOT NULL,
  otp        TEXT NOT NULL,
  expires_at DATETIME NOT NULL,
  used       INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ── Devices ──────────────────────────────────────────────────
CREATE TABLE cw_devices (
  id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id      TEXT REFERENCES cw_users(id) ON DELETE CASCADE,
  device_token TEXT,
  device_type  TEXT DEFAULT 'web',
  last_active  DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ── Blocked users ────────────────────────────────────────────
CREATE TABLE cw_blocked_users (
  blocker_id TEXT REFERENCES cw_users(id) ON DELETE CASCADE,
  blocked_id TEXT REFERENCES cw_users(id) ON DELETE CASCADE,
  blocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (blocker_id, blocked_id)
);

-- ── Chats ────────────────────────────────────────────────────
CREATE TABLE cw_chats (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  type            TEXT DEFAULT 'direct',
  last_message_id TEXT,
  last_message_at DATETIME,
  created_by      TEXT REFERENCES cw_users(id),
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ── Chat Participants ─────────────────────────────────────────
CREATE TABLE cw_chat_participants (
  chat_id      TEXT REFERENCES cw_chats(id) ON DELETE CASCADE,
  user_id      TEXT REFERENCES cw_users(id) ON DELETE CASCADE,
  is_pinned    INTEGER DEFAULT 0,
  is_archived  INTEGER DEFAULT 0,
  is_muted     INTEGER DEFAULT 0,
  mute_until   DATETIME,
  unread_count INTEGER DEFAULT 0,
  last_read_at DATETIME,
  joined_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (chat_id, user_id)
);

-- ── Groups ───────────────────────────────────────────────────
CREATE TABLE cw_groups (
  id                   TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  chat_id              TEXT UNIQUE REFERENCES cw_chats(id) ON DELETE CASCADE,
  name                 TEXT NOT NULL,
  description          TEXT,
  avatar_url           TEXT,
  invite_link          TEXT UNIQUE DEFAULT (lower(hex(randomblob(12)))),
  max_members          INTEGER DEFAULT 1024,
  is_announcement_only INTEGER DEFAULT 0,
  created_by           TEXT REFERENCES cw_users(id),
  created_at           DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ── Group Members ─────────────────────────────────────────────
CREATE TABLE cw_group_members (
  group_id  TEXT REFERENCES cw_groups(id) ON DELETE CASCADE,
  user_id   TEXT REFERENCES cw_users(id) ON DELETE CASCADE,
  role      TEXT DEFAULT 'member',
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  added_by  TEXT REFERENCES cw_users(id),
  PRIMARY KEY (group_id, user_id)
);

-- ── Messages ─────────────────────────────────────────────────
CREATE TABLE cw_messages (
  id                      TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  chat_id                 TEXT REFERENCES cw_chats(id) ON DELETE CASCADE,
  sender_id               TEXT REFERENCES cw_users(id),
  type                    TEXT DEFAULT 'text',
  content                 TEXT,
  media_url               TEXT,
  media_thumbnail         TEXT,
  media_size              INTEGER,
  media_name              TEXT,
  duration                INTEGER,
  latitude                REAL,
  longitude               REAL,
  location_name           TEXT,
  reply_to_id             TEXT REFERENCES cw_messages(id),
  forwarded_from_id       TEXT,
  poll_data               TEXT,
  is_starred              INTEGER DEFAULT 0,
  is_deleted_for_everyone INTEGER DEFAULT 0,
  deleted_for             TEXT,
  expires_at              DATETIME,
  created_at              DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ── Message Status (Read Receipts) ───────────────────────────
CREATE TABLE cw_message_status (
  message_id TEXT REFERENCES cw_messages(id) ON DELETE CASCADE,
  user_id    TEXT REFERENCES cw_users(id) ON DELETE CASCADE,
  status     TEXT DEFAULT 'delivered',
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (message_id, user_id)
);

-- ── Message Reactions ────────────────────────────────────────
CREATE TABLE cw_message_reactions (
  id         TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  message_id TEXT REFERENCES cw_messages(id) ON DELETE CASCADE,
  user_id    TEXT REFERENCES cw_users(id) ON DELETE CASCADE,
  emoji      TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (message_id, user_id)
);

-- ── Status Stories ───────────────────────────────────────────
CREATE TABLE cw_statuses (
  id               TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id          TEXT REFERENCES cw_users(id) ON DELETE CASCADE,
  type             TEXT DEFAULT 'text',
  content          TEXT,
  media_url        TEXT,
  background_color TEXT DEFAULT '#00a884',
  text_color       TEXT DEFAULT '#ffffff',
  font_size        INTEGER DEFAULT 24,
  privacy          TEXT DEFAULT 'contacts',
  expires_at       DATETIME DEFAULT (datetime('now', '+1 day')),
  created_at       DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ── Status Views ─────────────────────────────────────────────
CREATE TABLE cw_status_views (
  status_id TEXT REFERENCES cw_statuses(id) ON DELETE CASCADE,
  viewer_id TEXT REFERENCES cw_users(id) ON DELETE CASCADE,
  viewed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  reaction  TEXT,
  PRIMARY KEY (status_id, viewer_id)
);

-- ── Communities ──────────────────────────────────────────────
CREATE TABLE cw_communities (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name        TEXT NOT NULL,
  description TEXT,
  avatar_url  TEXT,
  invite_link TEXT UNIQUE DEFAULT (lower(hex(randomblob(12)))),
  created_by  TEXT REFERENCES cw_users(id),
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ── Community Members ────────────────────────────────────────
CREATE TABLE cw_community_members (
  community_id TEXT REFERENCES cw_communities(id) ON DELETE CASCADE,
  user_id      TEXT REFERENCES cw_users(id) ON DELETE CASCADE,
  role         TEXT DEFAULT 'member',
  joined_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (community_id, user_id)
);

-- ── Community Groups ─────────────────────────────────────────
CREATE TABLE cw_community_groups (
  community_id    TEXT REFERENCES cw_communities(id) ON DELETE CASCADE,
  group_id        TEXT REFERENCES cw_groups(id) ON DELETE CASCADE,
  is_announcement INTEGER DEFAULT 0,
  PRIMARY KEY (community_id, group_id)
);

-- ── Calls ────────────────────────────────────────────────────
CREATE TABLE cw_calls (
  id         TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  caller_id  TEXT REFERENCES cw_users(id),
  callee_id  TEXT REFERENCES cw_users(id),
  chat_id    TEXT REFERENCES cw_chats(id),
  type       TEXT DEFAULT 'voice',
  status     TEXT DEFAULT 'missed',
  duration   INTEGER DEFAULT 0,
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  ended_at   DATETIME
);

-- ── Reports ──────────────────────────────────────────────────
CREATE TABLE cw_reports (
  id               TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  reporter_id      TEXT REFERENCES cw_users(id),
  reported_user_id TEXT REFERENCES cw_users(id),
  message_id       TEXT REFERENCES cw_messages(id),
  reason           TEXT,
  description      TEXT,
  status           TEXT DEFAULT 'pending',
  reviewed_by      TEXT REFERENCES cw_users(id),
  created_at       DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ── Seed Admin User ──────────────────────────────────────────
INSERT OR IGNORE INTO cw_users (id, email, name, role, about, password_hash) VALUES
  ('admin-uuid-1234', 'admin@chatwave.app', 'ChatWave Admin', 'admin', 'ChatWave Administrator',
   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy');
