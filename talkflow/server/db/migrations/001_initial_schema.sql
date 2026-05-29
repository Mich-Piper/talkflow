-- server/db/migrations/001_initial_schema.sql

CREATE TABLE workspaces (
  id         CHAR(36)     PRIMARY KEY,
  name       VARCHAR(200) NOT NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE users (
  id           CHAR(36)     PRIMARY KEY,   -- Firebase UID
  workspace_id CHAR(36)     NOT NULL REFERENCES workspaces(id),
  display_name VARCHAR(200) NOT NULL,
  avatar_url   TEXT,
  email        VARCHAR(255) NOT NULL UNIQUE,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_users_workspace (workspace_id)
);

CREATE TABLE channels (
  id           CHAR(36)     PRIMARY KEY DEFAULT (UUID()),
  workspace_id CHAR(36)     NOT NULL REFERENCES workspaces(id),
  name         VARCHAR(100) NOT NULL,
  description  TEXT,
  is_private   BOOLEAN      NOT NULL DEFAULT FALSE,
  created_by   CHAR(36)     NOT NULL REFERENCES users(id),
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_channels_workspace (workspace_id)
);

CREATE TABLE channel_members (
  channel_id CHAR(36) NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  user_id    CHAR(36) NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
  joined_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (channel_id, user_id)
);

CREATE TABLE messages (
  id          BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
  channel_id  CHAR(36)     NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  user_id     CHAR(36)     NOT NULL REFERENCES users(id),
  content     TEXT         NOT NULL,
  thread_id   BIGINT       REFERENCES messages(id),  -- NULL = root message
  file_url    TEXT,
  edited_at   DATETIME,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_messages_channel_time (channel_id, created_at DESC),
  INDEX idx_messages_thread (thread_id)
);

CREATE TABLE reactions (
  id         BIGINT   NOT NULL AUTO_INCREMENT PRIMARY KEY,
  message_id BIGINT   NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id    CHAR(36) NOT NULL REFERENCES users(id),
  emoji      CHAR(10) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_reaction (message_id, user_id, emoji)
);
