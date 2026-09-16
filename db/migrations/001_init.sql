-- OTF core schema.
-- SQLite via node:sqlite. Foreign keys are enforced (PRAGMA set on connect).

------------------------------------------------------------------------------
-- Identity
------------------------------------------------------------------------------

CREATE TABLE users (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  username       TEXT    NOT NULL UNIQUE,
  email          TEXT    NOT NULL UNIQUE,
  password_hash  TEXT    NOT NULL,
  role           TEXT    NOT NULL DEFAULT 'player'
                   CHECK (role IN ('player', 'author', 'admin')),
  points         INTEGER NOT NULL DEFAULT 0,
  bio            TEXT    NOT NULL DEFAULT '',
  created_at     TEXT    NOT NULL DEFAULT (datetime('now')),
  last_seen_at   TEXT
);

CREATE INDEX idx_users_points ON users(points DESC);

CREATE TABLE sessions (
  id          TEXT    PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  expires_at  TEXT    NOT NULL,
  user_agent  TEXT    NOT NULL DEFAULT ''
);

CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_expiry ON sessions(expires_at);

------------------------------------------------------------------------------
-- Content: paths -> rooms -> tasks -> questions -> hints
-- The filesystem under content/ is the source of truth; these tables are a
-- queryable cache rebuilt by `npm run content:sync`.
------------------------------------------------------------------------------

CREATE TABLE paths (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  slug         TEXT    NOT NULL UNIQUE,
  title        TEXT    NOT NULL,
  summary      TEXT    NOT NULL DEFAULT '',
  description  TEXT    NOT NULL DEFAULT '',
  difficulty   TEXT    NOT NULL DEFAULT 'beginner',
  icon         TEXT    NOT NULL DEFAULT 'path',
  order_index  INTEGER NOT NULL DEFAULT 0,
  published    INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE rooms (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  slug           TEXT    NOT NULL UNIQUE,
  title          TEXT    NOT NULL,
  summary        TEXT    NOT NULL DEFAULT '',
  difficulty     TEXT    NOT NULL DEFAULT 'easy'
                   CHECK (difficulty IN ('intro','easy','medium','hard','insane')),
  -- JSON arrays, denormalised for cheap filtering via json_each()
  purdue_levels  TEXT    NOT NULL DEFAULT '[]',
  protocols      TEXT    NOT NULL DEFAULT '[]',
  attack_ics     TEXT    NOT NULL DEFAULT '[]',
  tags           TEXT    NOT NULL DEFAULT '[]',
  points         INTEGER NOT NULL DEFAULT 0,
  est_minutes    INTEGER NOT NULL DEFAULT 30,
  author         TEXT    NOT NULL DEFAULT 'OTF',
  free           INTEGER NOT NULL DEFAULT 1,
  published      INTEGER NOT NULL DEFAULT 1,
  order_index    INTEGER NOT NULL DEFAULT 0,
  -- Lab specification (JSON) or NULL for content-only rooms
  lab_spec       TEXT,
  banner         TEXT    NOT NULL DEFAULT '',
  content_hash   TEXT    NOT NULL DEFAULT '',
  created_at     TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_rooms_difficulty ON rooms(difficulty);
CREATE INDEX idx_rooms_published ON rooms(published);

CREATE TABLE path_rooms (
  path_id      INTEGER NOT NULL REFERENCES paths(id) ON DELETE CASCADE,
  room_id      INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  order_index  INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (path_id, room_id)
);

CREATE TABLE room_prereqs (
  room_id           INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  requires_room_id  INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  PRIMARY KEY (room_id, requires_room_id)
);

CREATE TABLE tasks (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id      INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  slug         TEXT    NOT NULL,
  title        TEXT    NOT NULL,
  body_md      TEXT    NOT NULL DEFAULT '',
  order_index  INTEGER NOT NULL DEFAULT 0,
  UNIQUE (room_id, slug)
);

CREATE INDEX idx_tasks_room ON tasks(room_id, order_index);

CREATE TABLE questions (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id         INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  room_id         INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  ref             TEXT    NOT NULL,
  prompt          TEXT    NOT NULL,
  kind            TEXT    NOT NULL DEFAULT 'static'
                    CHECK (kind IN ('static','regex','dynamic','numeric','choice','ack')),
  -- JSON: {hash} | {pattern,flags} | {prefix} | {value,tolerance,unit} | {options,correct}
  answer_spec     TEXT    NOT NULL DEFAULT '{}',
  points          INTEGER NOT NULL DEFAULT 10,
  case_sensitive  INTEGER NOT NULL DEFAULT 0,
  placeholder     TEXT    NOT NULL DEFAULT '',
  explain_md      TEXT    NOT NULL DEFAULT '',
  order_index     INTEGER NOT NULL DEFAULT 0,
  UNIQUE (room_id, ref)
);

CREATE INDEX idx_questions_task ON questions(task_id, order_index);

CREATE TABLE hints (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  question_id  INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  body_md      TEXT    NOT NULL,
  cost         INTEGER NOT NULL DEFAULT 0,
  order_index  INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_hints_question ON hints(question_id, order_index);

------------------------------------------------------------------------------
-- Progress and scoring
------------------------------------------------------------------------------

CREATE TABLE submissions (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_id  INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  room_id      INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  value        TEXT    NOT NULL,
  correct      INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_submissions_user_time ON submissions(user_id, created_at DESC);
CREATE INDEX idx_submissions_question ON submissions(question_id);

CREATE TABLE question_progress (
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_id     INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  room_id         INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  solved_at       TEXT    NOT NULL DEFAULT (datetime('now')),
  points_awarded  INTEGER NOT NULL DEFAULT 0,
  first_blood     INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, question_id)
);

CREATE INDEX idx_qprogress_room ON question_progress(user_id, room_id);

CREATE TABLE room_progress (
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  room_id       INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  started_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  completed_at  TEXT,
  PRIMARY KEY (user_id, room_id)
);

CREATE TABLE hint_unlocks (
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  hint_id      INTEGER NOT NULL REFERENCES hints(id) ON DELETE CASCADE,
  cost         INTEGER NOT NULL DEFAULT 0,
  unlocked_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, hint_id)
);

CREATE TABLE badges (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  slug         TEXT    NOT NULL UNIQUE,
  title        TEXT    NOT NULL,
  description  TEXT    NOT NULL DEFAULT '',
  icon         TEXT    NOT NULL DEFAULT 'award',
  -- JSON: {type:'room_complete',room:'slug'} | {type:'points',min:N}
  --     | {type:'path_complete',path:'slug'} | {type:'first_blood',count:N}
  --     | {type:'protocol',protocol:'modbus',count:N}
  criteria     TEXT    NOT NULL DEFAULT '{}'
);

CREATE TABLE user_badges (
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_id    INTEGER NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  awarded_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, badge_id)
);

------------------------------------------------------------------------------
-- Labs
------------------------------------------------------------------------------

CREATE TABLE lab_instances (
  id           TEXT    PRIMARY KEY,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  room_id      INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  state        TEXT    NOT NULL DEFAULT 'queued'
                 CHECK (state IN ('queued','starting','running','stopping','stopped','failed')),
  endpoints    TEXT    NOT NULL DEFAULT '[]',
  error        TEXT    NOT NULL DEFAULT '',
  created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
  expires_at   TEXT    NOT NULL,
  stopped_at   TEXT
);

CREATE INDEX idx_labs_user_state ON lab_instances(user_id, state);
CREATE INDEX idx_labs_expiry ON lab_instances(expires_at) WHERE state = 'running';

------------------------------------------------------------------------------
-- Audit
------------------------------------------------------------------------------

CREATE TABLE audit_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action      TEXT    NOT NULL,
  detail      TEXT    NOT NULL DEFAULT '{}',
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_audit_time ON audit_log(created_at DESC);
