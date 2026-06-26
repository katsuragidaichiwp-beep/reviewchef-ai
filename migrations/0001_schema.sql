PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'meo_ops',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stores (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  name TEXT NOT NULL,
  gbp_account_name TEXT,
  gbp_location_name TEXT,
  address TEXT,
  phone TEXT,
  timezone TEXT NOT NULL DEFAULT 'Asia/Tokyo',
  auto_reply_enabled INTEGER NOT NULL DEFAULT 0,
  auto_reply_ratings_json TEXT NOT NULL DEFAULT '[5]',
  auto_reply_run_at TEXT NOT NULL DEFAULT '23:00',
  auto_reply_check_keywords_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id)
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  store_id TEXT,
  email TEXT,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'operator', 'field_staff')),
  line_user_id TEXT,
  slack_user_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id),
  FOREIGN KEY (store_id) REFERENCES stores(id)
);

CREATE TABLE IF NOT EXISTS integrations (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  store_id TEXT,
  provider TEXT NOT NULL CHECK (provider IN ('google_business_profile', 'line', 'slack', 'openai')),
  status TEXT NOT NULL DEFAULT 'not_configured',
  config_json TEXT NOT NULL DEFAULT '{}',
  encrypted_secret_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id),
  FOREIGN KEY (store_id) REFERENCES stores(id)
);

CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL,
  google_review_name TEXT,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  author_name TEXT,
  comment TEXT NOT NULL,
  language_code TEXT,
  priority TEXT NOT NULL DEFAULT 'P3',
  sentiment TEXT NOT NULL DEFAULT 'neutral',
  issues_json TEXT NOT NULL DEFAULT '[]',
  ai_summary TEXT,
  risk_reason TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'drafted', 'auto_scheduled', 'needs_check', 'needs_approval', 'replied')),
  auto_reply_scheduled_at TEXT,
  auto_reply_mode TEXT,
  auto_blocked_reason TEXT,
  google_created_at TEXT,
  google_updated_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (store_id) REFERENCES stores(id)
);

CREATE TABLE IF NOT EXISTS review_replies (
  id TEXT PRIMARY KEY,
  review_id TEXT NOT NULL,
  draft_text TEXT NOT NULL,
  final_text TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approval', 'scheduled', 'posted', 'failed')),
  auto_generated INTEGER NOT NULL DEFAULT 0,
  approved_by_user_id TEXT,
  scheduled_at TEXT,
  posted_at TEXT,
  google_response_json TEXT,
  error_text TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (review_id) REFERENCES reviews(id),
  FOREIGN KEY (approved_by_user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL,
  source_review_id TEXT,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'P2',
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'done', 'dismissed')),
  due_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (store_id) REFERENCES stores(id),
  FOREIGN KEY (source_review_id) REFERENCES reviews(id)
);

CREATE TABLE IF NOT EXISTS field_events (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL,
  user_id TEXT,
  source TEXT NOT NULL CHECK (source IN ('line', 'slack', 'web_preview')),
  event_type TEXT NOT NULL CHECK (event_type IN ('review_confirmed', 'review_escalated', 'gbp_post_idea')),
  review_id TEXT,
  payload_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (store_id) REFERENCES stores(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (review_id) REFERENCES reviews(id)
);

CREATE TABLE IF NOT EXISTS gbp_posts (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'admin' CHECK (source IN ('admin', 'line', 'slack', 'web_preview')),
  topic_type TEXT NOT NULL DEFAULT 'STANDARD',
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  action_type TEXT DEFAULT 'LEARN_MORE',
  action_url TEXT,
  start_date TEXT,
  end_date TEXT,
  media_asset_id TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approval', 'published', 'failed')),
  google_local_post_name TEXT,
  google_search_url TEXT,
  google_state TEXT,
  approved_by_user_id TEXT,
  published_at TEXT,
  error_text TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (store_id) REFERENCES stores(id),
  FOREIGN KEY (media_asset_id) REFERENCES media_assets(id),
  FOREIGN KEY (approved_by_user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS media_assets (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  content_type TEXT NOT NULL,
  public_url TEXT,
  created_by_user_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (store_id) REFERENCES stores(id),
  FOREIGN KEY (created_by_user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  store_id TEXT,
  channel TEXT NOT NULL CHECK (channel IN ('line', 'slack', 'email', 'admin')),
  target TEXT NOT NULL,
  subject TEXT,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'failed')),
  error_text TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  sent_at TEXT,
  FOREIGN KEY (organization_id) REFERENCES organizations(id),
  FOREIGN KEY (store_id) REFERENCES stores(id)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  store_id TEXT,
  actor_user_id TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  before_json TEXT,
  after_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id),
  FOREIGN KEY (store_id) REFERENCES stores(id),
  FOREIGN KEY (actor_user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_store_status_created ON reviews(store_id, status, google_created_at);
CREATE INDEX IF NOT EXISTS idx_reviews_priority ON reviews(priority);
CREATE INDEX IF NOT EXISTS idx_review_replies_review ON review_replies(review_id);
CREATE INDEX IF NOT EXISTS idx_tasks_store_status ON tasks(store_id, status);
CREATE INDEX IF NOT EXISTS idx_field_events_store_created ON field_events(store_id, created_at);
CREATE INDEX IF NOT EXISTS idx_gbp_posts_store_status ON gbp_posts(store_id, status);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
