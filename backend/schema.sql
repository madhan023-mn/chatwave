-- ============================================================
-- ChatWave MySQL Schema
-- ============================================================
SET FOREIGN_KEY_CHECKS = 0;

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

SET FOREIGN_KEY_CHECKS = 1;

-- ── Users ────────────────────────────────────────────────────
CREATE TABLE cw_users (
  id            CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  phone         VARCHAR(20) UNIQUE,
  email         VARCHAR(255) UNIQUE,
  password_hash VARCHAR(255),
  name          VARCHAR(255) NOT NULL,
  about         TEXT DEFAULT 'Hey there! I am using ChatWave.',
  avatar_url    TEXT,
  is_online     TINYINT(1) DEFAULT 0,
  last_seen     DATETIME DEFAULT CURRENT_TIMESTAMP,
  role          VARCHAR(20) DEFAULT 'user',
  two_fa_enabled TINYINT(1) DEFAULT 0,
  push_token    TEXT,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ── OTPs ─────────────────────────────────────────────────────
CREATE TABLE cw_otps (
  id         CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  phone      VARCHAR(20) NOT NULL,
  otp        VARCHAR(6) NOT NULL,
  expires_at DATETIME NOT NULL,
  used       TINYINT(1) DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ── Devices ──────────────────────────────────────────────────
CREATE TABLE cw_devices (
  id           CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id      CHAR(36),
  device_token TEXT,
  device_type  VARCHAR(20) DEFAULT 'web',
  last_active  DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES cw_users(id) ON DELETE CASCADE
);

-- ── Blocked users ────────────────────────────────────────────
CREATE TABLE cw_blocked_users (
  blocker_id CHAR(36),
  blocked_id CHAR(36),
  blocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (blocker_id, blocked_id),
  FOREIGN KEY (blocker_id) REFERENCES cw_users(id) ON DELETE CASCADE,
  FOREIGN KEY (blocked_id) REFERENCES cw_users(id) ON DELETE CASCADE
);

-- ── Chats ────────────────────────────────────────────────────
CREATE TABLE cw_chats (
  id              CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  type            VARCHAR(20) DEFAULT 'direct',
  last_message_id CHAR(36),
  last_message_at DATETIME,
  created_by      CHAR(36),
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES cw_users(id)
);

-- ── Chat Participants ─────────────────────────────────────────
CREATE TABLE cw_chat_participants (
  chat_id      CHAR(36),
  user_id      CHAR(36),
  is_pinned    TINYINT(1) DEFAULT 0,
  is_archived  TINYINT(1) DEFAULT 0,
  is_muted     TINYINT(1) DEFAULT 0,
  mute_until   DATETIME,
  unread_count INT DEFAULT 0,
  last_read_at DATETIME,
  joined_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (chat_id, user_id),
  FOREIGN KEY (chat_id) REFERENCES cw_chats(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES cw_users(id) ON DELETE CASCADE
);

-- ── Groups ───────────────────────────────────────────────────
CREATE TABLE cw_groups (
  id                   CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  chat_id              CHAR(36) UNIQUE,
  name                 VARCHAR(255) NOT NULL,
  description          TEXT,
  avatar_url           TEXT,
  invite_link          VARCHAR(100) UNIQUE,
  max_members          INT DEFAULT 1024,
  is_announcement_only TINYINT(1) DEFAULT 0,
  created_by           CHAR(36),
  created_at           DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (chat_id) REFERENCES cw_chats(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES cw_users(id)
);

-- ── Group Members ─────────────────────────────────────────────
CREATE TABLE cw_group_members (
  group_id  CHAR(36),
  user_id   CHAR(36),
  role      VARCHAR(20) DEFAULT 'member',
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  added_by  CHAR(36),
  PRIMARY KEY (group_id, user_id),
  FOREIGN KEY (group_id) REFERENCES cw_groups(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES cw_users(id) ON DELETE CASCADE,
  FOREIGN KEY (added_by) REFERENCES cw_users(id)
);

-- ── Messages ─────────────────────────────────────────────────
CREATE TABLE cw_messages (
  id                      CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  chat_id                 CHAR(36),
  sender_id               CHAR(36),
  type                    VARCHAR(50) DEFAULT 'text',
  content                 TEXT,
  media_url               TEXT,
  media_thumbnail         TEXT,
  media_size              BIGINT,
  media_name              TEXT,
  duration                INT,
  latitude                DECIMAL(10, 8),
  longitude               DECIMAL(11, 8),
  location_name           TEXT,
  reply_to_id             CHAR(36),
  forwarded_from_id       CHAR(36),
  poll_data               JSON,
  is_starred              TINYINT(1) DEFAULT 0,
  is_deleted_for_everyone TINYINT(1) DEFAULT 0,
  deleted_for             JSON,
  expires_at              DATETIME,
  created_at              DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (chat_id) REFERENCES cw_chats(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES cw_users(id),
  FOREIGN KEY (reply_to_id) REFERENCES cw_messages(id)
);

ALTER TABLE cw_chats ADD CONSTRAINT fk_last_message
  FOREIGN KEY (last_message_id) REFERENCES cw_messages(id) ON DELETE SET NULL;

-- ── Message Status (Read Receipts) ───────────────────────────
CREATE TABLE cw_message_status (
  message_id CHAR(36),
  user_id    CHAR(36),
  status     VARCHAR(20) DEFAULT 'delivered',
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (message_id, user_id),
  FOREIGN KEY (message_id) REFERENCES cw_messages(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES cw_users(id) ON DELETE CASCADE
);

-- ── Message Reactions ────────────────────────────────────────
CREATE TABLE cw_message_reactions (
  id         CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  message_id CHAR(36),
  user_id    CHAR(36),
  emoji      VARCHAR(20) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_msg_user (message_id, user_id),
  FOREIGN KEY (message_id) REFERENCES cw_messages(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES cw_users(id) ON DELETE CASCADE
);

-- ── Status Stories ───────────────────────────────────────────
CREATE TABLE cw_statuses (
  id               CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id          CHAR(36),
  type             VARCHAR(20) DEFAULT 'text',
  content          TEXT,
  media_url        TEXT,
  background_color VARCHAR(20) DEFAULT '#00a884',
  text_color       VARCHAR(20) DEFAULT '#ffffff',
  font_size        INT DEFAULT 24,
  privacy          VARCHAR(20) DEFAULT 'contacts',
  expires_at       DATETIME DEFAULT (DATE_ADD(NOW(), INTERVAL 24 HOUR)),
  created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES cw_users(id) ON DELETE CASCADE
);

-- ── Status Views ─────────────────────────────────────────────
CREATE TABLE cw_status_views (
  status_id CHAR(36),
  viewer_id CHAR(36),
  viewed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  reaction  VARCHAR(20),
  PRIMARY KEY (status_id, viewer_id),
  FOREIGN KEY (status_id) REFERENCES cw_statuses(id) ON DELETE CASCADE,
  FOREIGN KEY (viewer_id) REFERENCES cw_users(id) ON DELETE CASCADE
);

-- ── Communities ──────────────────────────────────────────────
CREATE TABLE cw_communities (
  id          CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  name        VARCHAR(255) NOT NULL,
  description TEXT,
  avatar_url  TEXT,
  invite_link VARCHAR(100) UNIQUE,
  created_by  CHAR(36),
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES cw_users(id)
);

-- ── Community Members ────────────────────────────────────────
CREATE TABLE cw_community_members (
  community_id CHAR(36),
  user_id      CHAR(36),
  role         VARCHAR(20) DEFAULT 'member',
  joined_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (community_id, user_id),
  FOREIGN KEY (community_id) REFERENCES cw_communities(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES cw_users(id) ON DELETE CASCADE
);

-- ── Community Groups ─────────────────────────────────────────
CREATE TABLE cw_community_groups (
  community_id    CHAR(36),
  group_id        CHAR(36),
  is_announcement TINYINT(1) DEFAULT 0,
  PRIMARY KEY (community_id, group_id),
  FOREIGN KEY (community_id) REFERENCES cw_communities(id) ON DELETE CASCADE,
  FOREIGN KEY (group_id) REFERENCES cw_groups(id) ON DELETE CASCADE
);

-- ── Calls ────────────────────────────────────────────────────
CREATE TABLE cw_calls (
  id         CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  caller_id  CHAR(36),
  callee_id  CHAR(36),
  chat_id    CHAR(36),
  type       VARCHAR(20) DEFAULT 'voice',
  status     VARCHAR(20) DEFAULT 'missed',
  duration   INT DEFAULT 0,
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  ended_at   DATETIME,
  FOREIGN KEY (caller_id) REFERENCES cw_users(id),
  FOREIGN KEY (callee_id) REFERENCES cw_users(id),
  FOREIGN KEY (chat_id) REFERENCES cw_chats(id)
);

-- ── Reports ──────────────────────────────────────────────────
CREATE TABLE cw_reports (
  id               CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  reporter_id      CHAR(36),
  reported_user_id CHAR(36),
  message_id       CHAR(36),
  reason           VARCHAR(100),
  description      TEXT,
  status           VARCHAR(20) DEFAULT 'pending',
  reviewed_by      CHAR(36),
  created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (reporter_id) REFERENCES cw_users(id),
  FOREIGN KEY (reported_user_id) REFERENCES cw_users(id),
  FOREIGN KEY (message_id) REFERENCES cw_messages(id)
);

-- ── Indexes ──────────────────────────────────────────────────
CREATE INDEX idx_messages_chat_id ON cw_messages(chat_id);
CREATE INDEX idx_messages_created_at ON cw_messages(created_at DESC);
CREATE INDEX idx_chat_participants_user_id ON cw_chat_participants(user_id);
CREATE INDEX idx_statuses_expires_at ON cw_statuses(expires_at);
CREATE INDEX idx_statuses_user_id ON cw_statuses(user_id);
CREATE INDEX idx_users_email ON cw_users(email);
CREATE INDEX idx_users_phone ON cw_users(phone);
CREATE INDEX idx_group_members_user_id ON cw_group_members(user_id);

-- ── Seed Admin User ──────────────────────────────────────────
-- Default admin: admin@chatwave.app / Admin@123
INSERT INTO cw_users (id, email, name, role, about, password_hash) VALUES
  (UUID(), 'admin@chatwave.app', 'ChatWave Admin', 'admin', 'ChatWave Administrator',
   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy')
ON DUPLICATE KEY UPDATE name = name;
