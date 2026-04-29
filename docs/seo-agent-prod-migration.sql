-- HPM SEO Agent — production schema migration
--
-- Apply via Supabase SQL Editor (Project → SQL Editor → New query).
-- All statements are additive: new enums, new column on posts, two new
-- tables for seo_opportunities, plus the matching indexes/FKs.
--
-- Safe to run on a live prod DB. No existing data is modified or dropped.
-- After applying, the next deploy of the feat/seo-agent branch will succeed.
--
-- Idempotency: every statement is wrapped in IF NOT EXISTS where Postgres
-- supports it, so re-running this script is a no-op if it has already been
-- applied. (CREATE INDEX uses IF NOT EXISTS; CREATE TABLE uses IF NOT EXISTS;
-- CREATE TYPE has no native IF NOT EXISTS so we wrap in a DO block.)

-- ============================================================================
-- 1. Enums
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE "public"."enum_posts_seo_source" AS ENUM('manual', 'agent', 'imported');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "public"."enum__posts_v_version_seo_source" AS ENUM('manual', 'agent', 'imported');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "public"."enum_seo_opportunities_type" AS ENUM('meta_rewrite', 'on_page_tweak', 'new_article');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "public"."enum_seo_opportunities_intent" AS ENUM('transactional', 'navigational', 'commercial', 'informational', 'local');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "public"."enum_seo_opportunities_status" AS ENUM('pending', 'approved', 'rejected', 'completed', 'superseded');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- 2. Add seo_source to existing posts tables
-- ============================================================================

ALTER TABLE "posts"   ADD COLUMN IF NOT EXISTS "seo_source"         "enum_posts_seo_source" DEFAULT 'manual';
ALTER TABLE "_posts_v" ADD COLUMN IF NOT EXISTS "version_seo_source" "enum__posts_v_version_seo_source" DEFAULT 'manual';

-- ============================================================================
-- 3. New table: seo_opportunities
-- ============================================================================

CREATE TABLE IF NOT EXISTS "seo_opportunities" (
  "id"                    serial PRIMARY KEY NOT NULL,
  "query"                 varchar NOT NULL,
  "type"                  "enum_seo_opportunities_type" NOT NULL,
  "intent"                "enum_seo_opportunities_intent",
  "status"                "enum_seo_opportunities_status" DEFAULT 'pending' NOT NULL,
  "week_identified"       varchar NOT NULL,
  "metrics_impressions"   numeric,
  "metrics_clicks"        numeric,
  "metrics_ctr"           numeric,
  "metrics_position"      numeric,
  "metrics_expected_ctr"  numeric,
  "rationale"             varchar,
  "draft_content"         jsonb,
  "related_post_id"       integer,
  "notes"                 varchar,
  "decided_at"            timestamp(3) with time zone,
  "agent_run_id"          varchar,
  "updated_at"            timestamp(3) with time zone DEFAULT now() NOT NULL,
  "created_at"            timestamp(3) with time zone DEFAULT now() NOT NULL
);

-- ============================================================================
-- 4. New table: seo_opportunities_rels
-- (Payload's polymorphic relationship table for the targetPage field.)
-- ============================================================================

CREATE TABLE IF NOT EXISTS "seo_opportunities_rels" (
  "id"           serial PRIMARY KEY NOT NULL,
  "order"        integer,
  "parent_id"    integer NOT NULL,
  "path"         varchar NOT NULL,
  "pages_id"     integer,
  "posts_id"     integer,
  "services_id"  integer
);

-- ============================================================================
-- 5. payload_locked_documents_rels needs the new collection too
-- ============================================================================

ALTER TABLE "payload_locked_documents_rels"
  ADD COLUMN IF NOT EXISTS "seo_opportunities_id" integer;

-- ============================================================================
-- 6. Foreign keys
-- ============================================================================

DO $$ BEGIN
  ALTER TABLE "seo_opportunities"
    ADD CONSTRAINT "seo_opportunities_related_post_id_posts_id_fk"
    FOREIGN KEY ("related_post_id") REFERENCES "public"."posts"("id")
    ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "seo_opportunities_rels"
    ADD CONSTRAINT "seo_opportunities_rels_parent_fk"
    FOREIGN KEY ("parent_id") REFERENCES "public"."seo_opportunities"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "seo_opportunities_rels"
    ADD CONSTRAINT "seo_opportunities_rels_pages_fk"
    FOREIGN KEY ("pages_id") REFERENCES "public"."pages"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "seo_opportunities_rels"
    ADD CONSTRAINT "seo_opportunities_rels_posts_fk"
    FOREIGN KEY ("posts_id") REFERENCES "public"."posts"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "seo_opportunities_rels"
    ADD CONSTRAINT "seo_opportunities_rels_services_fk"
    FOREIGN KEY ("services_id") REFERENCES "public"."services"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "payload_locked_documents_rels"
    ADD CONSTRAINT "payload_locked_documents_rels_seo_opportunities_fk"
    FOREIGN KEY ("seo_opportunities_id") REFERENCES "public"."seo_opportunities"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- 7. Indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS "seo_opportunities_query_idx"           ON "seo_opportunities"      USING btree ("query");
CREATE INDEX IF NOT EXISTS "seo_opportunities_week_identified_idx" ON "seo_opportunities"      USING btree ("week_identified");
CREATE INDEX IF NOT EXISTS "seo_opportunities_related_post_idx"    ON "seo_opportunities"      USING btree ("related_post_id");
CREATE INDEX IF NOT EXISTS "seo_opportunities_updated_at_idx"      ON "seo_opportunities"      USING btree ("updated_at");
CREATE INDEX IF NOT EXISTS "seo_opportunities_created_at_idx"      ON "seo_opportunities"      USING btree ("created_at");
CREATE INDEX IF NOT EXISTS "seo_opportunities_rels_order_idx"      ON "seo_opportunities_rels" USING btree ("order");
CREATE INDEX IF NOT EXISTS "seo_opportunities_rels_parent_idx"     ON "seo_opportunities_rels" USING btree ("parent_id");
CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_seo_opportunities_id_idx"
  ON "payload_locked_documents_rels" USING btree ("seo_opportunities_id");

-- ============================================================================
-- 8. Follow-up: deferred column for new_article opportunities
--    (Added after initial migration. Distinguishes cap-deferred new_articles
--    from drafted ones in the digest counts. Idempotent.)
-- ============================================================================

ALTER TABLE "seo_opportunities"
  ADD COLUMN IF NOT EXISTS "deferred" boolean DEFAULT false;

-- Done. Verify with:
--   SELECT column_name FROM information_schema.columns WHERE table_name='posts' AND column_name='seo_source';
--   SELECT 1 FROM seo_opportunities LIMIT 1;
--   SELECT column_name FROM information_schema.columns WHERE table_name='seo_opportunities' AND column_name='deferred';
