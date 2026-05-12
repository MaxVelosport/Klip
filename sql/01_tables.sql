-- =============================================================
-- Neyroclip — CREATE TABLE (14 tables)
-- Run this in Supabase Studio → SQL Editor
-- All names already include Neyroclip_ prefix
-- =============================================================

CREATE TABLE IF NOT EXISTS "Neyroclip_users" (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email            TEXT        NOT NULL UNIQUE,
  password_hash    TEXT,
  oauth_provider   TEXT,
  oauth_id         TEXT,
  name             TEXT        NOT NULL,
  avatar_url       TEXT,
  phone            TEXT,
  role             TEXT        NOT NULL DEFAULT 'user',
  plan_id          TEXT        NOT NULL DEFAULT 'free',
  videos_used_this_period INTEGER NOT NULL DEFAULT 0,
  current_period_end  TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS "Neyroclip_sessions" (
  id           TEXT        PRIMARY KEY,
  user_id      UUID        NOT NULL,
  expires_at   TIMESTAMPTZ NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "Neyroclip_plans" (
  id               TEXT    PRIMARY KEY,
  name             TEXT    NOT NULL,
  tagline          TEXT    NOT NULL DEFAULT '',
  price_month_rub  INTEGER NOT NULL DEFAULT 0,
  price_year_rub   INTEGER NOT NULL DEFAULT 0,
  videos_per_month INTEGER NOT NULL DEFAULT 0,
  max_duration_min INTEGER NOT NULL DEFAULT 1,
  features         JSONB   NOT NULL DEFAULT '[]',
  watermark        BOOLEAN NOT NULL DEFAULT true,
  recommended      BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS "Neyroclip_subscriptions" (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID        NOT NULL,
  plan_id               TEXT        NOT NULL,
  status                TEXT        NOT NULL DEFAULT 'active',
  current_period_start  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_period_end    TIMESTAMPTZ NOT NULL,
  cancel_at_period_end  BOOLEAN     NOT NULL DEFAULT false,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "Neyroclip_projects" (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID          NOT NULL,
  title               TEXT          NOT NULL,
  topic_description   TEXT          NOT NULL DEFAULT '',
  category            TEXT          NOT NULL DEFAULT 'educational',
  target_duration_sec INTEGER       NOT NULL DEFAULT 180,
  duration_sec        INTEGER       NOT NULL DEFAULT 0,
  visual_style        TEXT          NOT NULL DEFAULT 'realism',
  voice_id            TEXT          NOT NULL DEFAULT 'baya',
  voice_speed         NUMERIC(3,2)  NOT NULL DEFAULT 1.00,
  background_music_id TEXT,
  music_volume        INTEGER       NOT NULL DEFAULT 35,
  add_subtitles       BOOLEAN       NOT NULL DEFAULT true,
  status              TEXT          NOT NULL DEFAULT 'draft',
  current_step        SMALLINT      NOT NULL DEFAULT 1,
  aspect_ratio        TEXT          NOT NULL DEFAULT '16:9',
  share_token         TEXT          UNIQUE,
  parent_project_id   UUID,
  final_video_url     TEXT,
  thumbnail_url       TEXT,
  error_message       TEXT,
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  deleted_at          TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS "Neyroclip_scenes" (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID          NOT NULL,
  order_index     SMALLINT      NOT NULL DEFAULT 0,
  title           TEXT          NOT NULL DEFAULT '',
  narration       TEXT          NOT NULL DEFAULT '',
  image_prompt    TEXT          NOT NULL DEFAULT '',
  image_url       TEXT,
  audio_url       TEXT,
  duration_sec    NUMERIC(6,2)  NOT NULL DEFAULT 6.00,
  animation_type  TEXT          NOT NULL DEFAULT 'ken_burns_zoom_in',
  transition_type TEXT          NOT NULL DEFAULT 'fade',
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "Neyroclip_script_messages" (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   UUID        NOT NULL,
  user_id      UUID        NOT NULL,
  role         TEXT        NOT NULL,
  content      TEXT        NOT NULL,
  diff_summary TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "Neyroclip_render_jobs" (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id     UUID        NOT NULL,
  job_type       TEXT        NOT NULL,
  status         TEXT        NOT NULL DEFAULT 'pending',
  progress       SMALLINT    NOT NULL DEFAULT 0,
  started_at     TIMESTAMPTZ,
  finished_at    TIMESTAMPTZ,
  error_message  TEXT,
  retry_count    SMALLINT    NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "Neyroclip_payments" (
  id                   UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID          NOT NULL,
  yookassa_payment_id  TEXT,
  amount_rub           NUMERIC(10,2) NOT NULL,
  status               TEXT          NOT NULL DEFAULT 'succeeded',
  purpose              TEXT          NOT NULL,
  description          TEXT          NOT NULL DEFAULT '',
  metadata             JSONB         NOT NULL DEFAULT '{}',
  created_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  succeeded_at         TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS "Neyroclip_token_balances" (
  user_id     UUID    PRIMARY KEY,
  balance     INTEGER NOT NULL DEFAULT 0,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- NOTE: column is "delta" (positive = credit, negative = debit)
-- ref_id is a free-form text reference (project_id, promo code, etc.)
CREATE TABLE IF NOT EXISTS "Neyroclip_token_transactions" (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL,
  delta       INTEGER     NOT NULL,
  reason      TEXT        NOT NULL,
  ref_id      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "Neyroclip_audit_log" (
  id           BIGSERIAL   PRIMARY KEY,
  user_id      UUID,
  action       TEXT        NOT NULL,
  entity_type  TEXT        NOT NULL DEFAULT '',
  entity_id    TEXT,
  message      TEXT        NOT NULL DEFAULT '',
  metadata     JSONB       NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "Neyroclip_promo_codes" (
  code            TEXT    PRIMARY KEY,
  discount_type   TEXT    NOT NULL DEFAULT 'tokens',
  discount_value  INTEGER NOT NULL DEFAULT 0,
  max_uses        INTEGER NOT NULL DEFAULT 0,
  used_count      INTEGER NOT NULL DEFAULT 0,
  valid_from      TIMESTAMPTZ,
  valid_until     TIMESTAMPTZ,
  is_active       BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS "Neyroclip_brand_kits" (
  user_id         UUID        PRIMARY KEY,
  brand_name      TEXT        NOT NULL DEFAULT '',
  logo_url        TEXT,
  primary_color   TEXT        NOT NULL DEFAULT '#7c3aed',
  accent_color    TEXT        NOT NULL DEFAULT '#06b6d4',
  font_choice     TEXT        NOT NULL DEFAULT 'inter',
  watermark_text  TEXT        NOT NULL DEFAULT '',
  tagline         TEXT        NOT NULL DEFAULT '',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_neyroclip_sessions_user_id    ON "Neyroclip_sessions"    (user_id);
CREATE INDEX IF NOT EXISTS idx_neyroclip_sessions_expires_at ON "Neyroclip_sessions"    (expires_at);
CREATE INDEX IF NOT EXISTS idx_neyroclip_projects_user_id    ON "Neyroclip_projects"    (user_id);
CREATE INDEX IF NOT EXISTS idx_neyroclip_projects_status     ON "Neyroclip_projects"    (status);
CREATE INDEX IF NOT EXISTS idx_neyroclip_scenes_project_id   ON "Neyroclip_scenes"      (project_id, order_index);
CREATE INDEX IF NOT EXISTS idx_neyroclip_render_jobs_project ON "Neyroclip_render_jobs" (project_id);
CREATE INDEX IF NOT EXISTS idx_neyroclip_render_jobs_status  ON "Neyroclip_render_jobs" (status);
CREATE INDEX IF NOT EXISTS idx_neyroclip_payments_user_id    ON "Neyroclip_payments"    (user_id);
CREATE INDEX IF NOT EXISTS idx_neyroclip_token_tx_user_id    ON "Neyroclip_token_transactions" (user_id);
CREATE INDEX IF NOT EXISTS idx_neyroclip_script_msg_project  ON "Neyroclip_script_messages"    (project_id);
CREATE INDEX IF NOT EXISTS idx_neyroclip_audit_user_id       ON "Neyroclip_audit_log"   (user_id);
