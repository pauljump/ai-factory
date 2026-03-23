-- Pods: small matched groups with AI facilitation
-- Platform capability — app defines match dimensions and prompt templates

CREATE TABLE IF NOT EXISTS pods (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name TEXT NOT NULL,                    -- AI-generated warm name
    match_criteria TEXT NOT NULL DEFAULT '{}',  -- JSON: the vector this pod was matched on
    max_members INTEGER NOT NULL DEFAULT 5,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS pod_members (
    pod_id TEXT NOT NULL REFERENCES pods(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    display_name TEXT NOT NULL,            -- Anonymous display name (auto-generated)
    joined_at TEXT NOT NULL DEFAULT (datetime('now')),
    left_at TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'left')),
    PRIMARY KEY (pod_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_pod_members_user ON pod_members(user_id, status);
CREATE INDEX IF NOT EXISTS idx_pod_members_pod ON pod_members(pod_id, status);

CREATE TABLE IF NOT EXISTS pod_messages (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    pod_id TEXT NOT NULL REFERENCES pods(id) ON DELETE CASCADE,
    user_id TEXT,                          -- NULL for AI/system messages
    message_type TEXT NOT NULL CHECK (message_type IN ('text', 'ai_prompt', 'win_share', 'tool_share', 'system')),
    content TEXT NOT NULL,
    metadata TEXT DEFAULT '{}',            -- JSON: tool config, moment data, etc.
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_pod_messages_pod ON pod_messages(pod_id, created_at);

CREATE TABLE IF NOT EXISTS pod_reactions (
    message_id TEXT NOT NULL REFERENCES pod_messages(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    reaction TEXT NOT NULL DEFAULT 'heart',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (message_id, user_id)
);

-- Match queue: users waiting to be matched into a pod
CREATE TABLE IF NOT EXISTS pod_match_queue (
    user_id TEXT PRIMARY KEY,
    match_vector TEXT NOT NULL DEFAULT '{}',  -- JSON: app-defined match dimensions
    queued_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Unlock tracking: has user met the threshold?
CREATE TABLE IF NOT EXISTS pod_unlock_status (
    user_id TEXT PRIMARY KEY,
    unlocked INTEGER NOT NULL DEFAULT 0,
    unlocked_at TEXT,
    active_days INTEGER NOT NULL DEFAULT 0,
    tool_sessions INTEGER NOT NULL DEFAULT 0,
    last_checked TEXT
);

-- Direct messages (1:1 between pod members)
CREATE TABLE IF NOT EXISTS dm_threads (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_a TEXT NOT NULL,                  -- Lower user_id (canonical ordering)
    user_b TEXT NOT NULL,                  -- Higher user_id
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(user_a, user_b)
);

CREATE INDEX IF NOT EXISTS idx_dm_threads_user_a ON dm_threads(user_a);
CREATE INDEX IF NOT EXISTS idx_dm_threads_user_b ON dm_threads(user_b);

CREATE TABLE IF NOT EXISTS dm_messages (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    thread_id TEXT NOT NULL REFERENCES dm_threads(id) ON DELETE CASCADE,
    sender_id TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_dm_messages_thread ON dm_messages(thread_id, created_at);

-- Exit interviews
CREATE TABLE IF NOT EXISTS pod_exit_interviews (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    pod_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    reason TEXT NOT NULL CHECK (reason IN ('bad_match', 'too_busy', 'found_what_i_needed', 'other')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
