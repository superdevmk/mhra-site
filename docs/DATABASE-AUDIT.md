# MHRA Supabase Database Audit Report

> **Project:** `lqhtqxuiahivairqaoeb`  
> **Audit date:** 2026-06-01  
> **Method:** Supabase MCP (`list_tables`, `execute_sql`, `list_storage_buckets`, `get_advisors`, `get_storage_config`)  
> **Mode:** Read-only — no changes made

---

## Executive summary

The MHRA database is a **small, content-focused schema** with **4 application tables** in `public`, **4 public storage buckets**, and **Supabase Auth email/password** as the only identity provider. Row Level Security (RLS) is **enabled on all content tables**, but authorization is **flat**: any authenticated user can create content and upload files; there is **no admin/editor/author role model**.

Main gaps for a professional blog/admin system:

- No `profiles` or role system
- No draft/scheduled publishing on `posts`
- No `language` column on blog posts (site is bilingual)
- Missing UPDATE/DELETE RLS on `hr_events` and `yearly_conferences`
- Storage uploads are not scoped to uploader or admin role
- Open public registration with no approval workflow
- Duplicate RLS policies on `informative_posts`
- No migration history tracked in Supabase CLI

---

## 1. All tables

### Application tables (`public`) — 4 tables

| Table | Rows | RLS | Purpose |
|-------|------|-----|---------|
| `posts` | 2 | ✅ | Blog posts |
| `informative_posts` | 21 | ✅ | News / informative content |
| `hr_events` | 23 | ✅ | HR events |
| `yearly_conferences` | 26 | ✅ | Annual conference content |

**Total application rows:** 72

### Auth tables (`auth`) — managed by Supabase

Key tables present (standard Supabase Auth schema):

| Table | Rows | Notes |
|-------|------|-------|
| `auth.users` | 5 | Registered accounts |
| `auth.identities` | 5 | All `email` provider |
| `auth.sessions` | 8 | Active/recent sessions |
| `auth.refresh_tokens` | 26 | Token store |
| `auth.mfa_factors` | 0 | MFA not in use |
| `auth.sso_providers` | 0 | SSO not configured |

Plus standard auth internals: `audit_log_entries`, `flow_state`, `one_time_tokens`, OAuth tables, WebAuthn tables, etc.

### Storage tables (`storage`) — managed by Supabase

| Table | Rows | Notes |
|-------|------|-------|
| `storage.buckets` | 4 | MHRA asset buckets |
| `storage.objects` | 164 | Uploaded files |

---

## 2. All columns

### `public.posts`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `bigint` | NO | `nextval('posts_id_seq')` | PK |
| `author_id` | `uuid` | NO | — | FK → `auth.users(id)` ON DELETE CASCADE |
| `title` | `text` | NO | — | |
| `body` | `text` | NO | — | Markdown/plain text |
| `created_at` | `timestamptz` | NO | `now()` | |
| `image_url` | `text` | YES | — | Public URL from `blog-images` bucket |

**Missing vs. professional blog:** `language`, `published`, `slug`, `excerpt`, `updated_at`, `published_at`, `status`, `meta_title`, `meta_description`, `deleted_at`

---

### `public.informative_posts`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `bigint` | NO | sequence | PK |
| `author_id` | `uuid` | NO | — | FK → `auth.users(id)` ON DELETE CASCADE |
| `language` | `text` | NO | — | Values: `mk`, `en` |
| `title` | `text` | NO | — | |
| `subtitle` | `text` | YES | — | |
| `body` | `text` | NO | — | |
| `images` | `text[]` | YES | `'{}'` | Array of public URLs |
| `created_at` | `timestamptz` | NO | `now()` | |
| `published` | `boolean` | NO | `true` | Draft support exists |

**Missing:** `updated_at`, `published_at`, `slug`, `sort_order`, `deleted_at`

---

### `public.hr_events`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `bigint` | NO | sequence | PK |
| `author_id` | `uuid` | NO | — | FK → `auth.users(id)` ON DELETE CASCADE |
| `language` | `text` | NO | — | `mk`, `en` |
| `title` | `text` | NO | — | |
| `subtitle` | `text` | YES | — | |
| `body` | `text` | NO | — | |
| `images` | `text[]` | YES | `'{}'` | |
| `event_date` | `date` | YES | — | |
| `location` | `text` | YES | — | |
| `created_at` | `timestamptz` | NO | `now()` | |
| `published` | `boolean` | NO | `true` | |

**Missing:** `updated_at`, `slug`, `deleted_at`

---

### `public.yearly_conferences`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `bigint` | NO | sequence | PK |
| `author_id` | `uuid` | NO | — | FK → `auth.users(id)` ON DELETE CASCADE |
| `language` | `text` | NO | — | `mk`, `en` |
| `title` | `text` | NO | — | |
| `subtitle` | `text` | YES | — | |
| `body` | `text` | NO | — | |
| `images` | `text[]` | YES | `'{}'` | |
| `year` | `integer` | YES | — | Unique to this table |
| `event_date` | `date` | YES | — | |
| `location` | `text` | YES | — | |
| `created_at` | `timestamptz` | NO | `now()` | |
| `published` | `boolean` | NO | `true` | |

**Missing:** `updated_at`, `slug`, `deleted_at`

---

### Indexes (public)

Only **primary key indexes** exist — one per table on `id`:

- `posts_pkey`
- `informative_posts_pkey`
- `hr_events_pkey`
- `yearly_conferences_pkey`

**No indexes on:** `author_id`, `language`, `published`, `event_date`, `created_at`  
(Supabase advisor flagged all 4 FK columns as unindexed.)

---

## 3. Relationships

### Entity relationship diagram

```
auth.users (id)
    │
    ├──< posts.author_id                    [ON DELETE CASCADE]
    ├──< informative_posts.author_id        [ON DELETE CASCADE]
    ├──< hr_events.author_id                [ON DELETE CASCADE]
    └──< yearly_conferences.author_id       [ON DELETE CASCADE]

storage.buckets (id)
    └──< storage.objects.bucket_id
```

### Foreign keys

| Child table | Column | Parent | On delete |
|-------------|--------|--------|-----------|
| `posts` | `author_id` | `auth.users(id)` | CASCADE |
| `informative_posts` | `author_id` | `auth.users(id)` | CASCADE |
| `hr_events` | `author_id` | `auth.users(id)` | CASCADE |
| `yearly_conferences` | `author_id` | `auth.users(id)` | CASCADE |

### Logical relationships (not enforced in DB)

- `posts.image_url` → objects in `blog-images` bucket (URL string only, no FK)
- `*.images[]` → objects in asset buckets (URL strings only, no FK)
- No cross-table relationships (e.g. event → conference)
- No `profiles` table linked to `auth.users`

### Content by language (row counts)

| Table | MK | EN |
|-------|----|----|
| `informative_posts` | 11 | 10 |
| `hr_events` | 12 | 11 |
| `yearly_conferences` | 14 | 12 |
| `posts` | — | — (no language column) |

All rows currently have `published = true` (no drafts in DB).

---

## 4. Storage buckets

| Bucket | Public | Objects | Created | Used by |
|--------|--------|---------|---------|---------|
| `blog-images` | ✅ | 7 | 2025-12-25 | Blog post images (`posts.image_url`) |
| `informative-assets` | ✅ | 76 | 2026-01-06 | Informative admin uploads |
| `events-assets` | ✅ | 47 | 2026-01-08 | HR events admin uploads |
| `conferences-assets` | ✅ | 34 | 2026-01-08 | Conferences admin uploads |

**Total stored objects:** 164

### Storage configuration

| Setting | Value |
|---------|-------|
| File size limit | 50 MB (52,428,800 bytes) |
| Image transformation | Enabled |
| Allowed MIME types | Not restricted (null on all buckets) |
| Vector buckets | Disabled |

### Storage RLS policies (`storage.objects`)

| Policy | Role(s) | Command | Condition |
|--------|---------|---------|-----------|
| Anyone can view blog images | anon, authenticated | SELECT | `bucket_id = 'blog-images'` |
| Anyone can read informative assets | anon, authenticated | SELECT | `bucket_id = 'informative-assets'` |
| Anyone can read events assets | anon, authenticated | SELECT | `bucket_id = 'events-assets'` |
| Anyone can read conferences assets | anon, authenticated | SELECT | `bucket_id = 'conferences-assets'` |
| Authenticated users can upload blog images | authenticated | INSERT | `bucket_id = 'blog-images'` |
| Authenticated can upload informative assets | authenticated | INSERT | `bucket_id = 'informative-assets'` |
| Authenticated can upload events assets | authenticated | INSERT | `bucket_id = 'events-assets'` |
| Authenticated can upload conferences assets | authenticated | INSERT | `bucket_id = 'conferences-assets'` |

**Missing storage policies:** UPDATE, DELETE — no way for users/admins to remove or replace files via RLS (may require service role or dashboard).

**Upload path pattern in app:** flat filenames (`{timestamp}-{random}.ext`) or `{userId}/{filename}` for blog — **no ownership check in storage RLS**.

---

## 5. Auth setup

### Provider configuration

| Provider | Status |
|----------|--------|
| Email/password | ✅ Active (only provider) |
| OAuth (Google, GitHub, etc.) | ❌ Not configured |
| SSO/SAML | ❌ Not configured |
| MFA/TOTP | ❌ Not enabled (0 factors) |
| Phone auth | ❌ Not in use |

### Registered users (5)

| Email | Confirmed | Last sign-in | Provider |
|-------|-----------|--------------|----------|
| alimiatdhe9@gmail.com | ✅ | 2026-05-28 | email |
| superdev.mk@gmail.com | ✅ | 2025-12-25 | email |
| air.alimi.atdhe@gmail.com | ✅ | 2026-03-19 | email |
| mickoski.darko@yahoo.com | ✅ | 2026-05-28 | email |
| contact@mhra.mk | ❌ | never | email |

### Auth metadata pattern

All users have standard Supabase metadata:

```json
raw_app_meta_data: { "provider": "email", "providers": ["email"] }
raw_user_meta_data: { "sub": "...", "email": "...", "email_verified": true/false }
```

**No custom roles** in `app_metadata` (e.g. no `role: "admin"`).

### Auth security settings (from advisors)

| Setting | Status |
|---------|--------|
| Leaked password protection (HaveIBeenPwned) | ❌ Disabled |

### Sign-up behavior (inferred from app + policies)

- Public self-registration enabled via `login.html` (`signUp`)
- Email confirmation appears required for most users (4/5 confirmed)
- No invite-only or admin-approval flow in database

---

## 6. User roles

### Postgres / Supabase roles

| Role | Purpose |
|------|---------|
| `anon` | Unauthenticated API access (public site) |
| `authenticated` | Logged-in users (authors + anyone who registers) |
| `service_role` | Bypasses RLS (server-side only — not in client) |

### Custom roles

**None.** There is no:

- `profiles` table with `role` column
- Custom Postgres roles (`admin`, `editor`, `author`)
- RBAC via `auth.jwt()` claims
- Separate admin vs author permissions

### Effective permission model today

| Action | anon | authenticated |
|--------|------|---------------|
| Read published content | ✅ | ✅ |
| Read all blog posts | ✅ (including any future drafts if added without RLS change) | ✅ |
| Create content (all 4 tables) | ❌ | ✅ |
| Update own content | ❌ | ✅ posts, informative_posts only |
| Delete own content | ❌ | ✅ posts, informative_posts only |
| Upload to all storage buckets | ❌ | ✅ |
| List all bucket files | ✅ | ✅ |

**One user (`3cf9dcf8…`) authored 95%+ of content** across informative, events, and conferences tables.

---

## 7. RLS policies

RLS is **enabled** on all 4 public tables (`rowsecurity = true`).

### `posts` — 4 policies

| Policy | Roles | Command | USING | WITH CHECK |
|--------|-------|---------|-------|------------|
| Posts are publicly readable | anon, authenticated | SELECT | `true` | — |
| Authenticated users can create posts | authenticated | INSERT | — | `auth.uid() = author_id` |
| Authors can update own posts | authenticated | UPDATE | `auth.uid() = author_id` | — |
| Authors can delete own posts | authenticated | DELETE | `auth.uid() = author_id` | — |

⚠️ **SELECT policy is `true`** — all posts are always publicly visible. No draft/hidden support at DB level.

---

### `informative_posts` — 8 policies (includes duplicates)

| Policy | Roles | Command | USING | WITH CHECK |
|--------|-------|---------|-------|------------|
| Informative posts are publicly readable | anon, authenticated | SELECT | `published = true` | — |
| Authenticated can insert informative posts | authenticated | INSERT | — | `auth.uid() = author_id` |
| Authenticated users can create informative posts | authenticated | INSERT | — | `auth.uid() = author_id` |
| Authors can update informative posts | authenticated | UPDATE | `auth.uid() = author_id` | — |
| Authors can update own informative posts | authenticated | UPDATE | `auth.uid() = author_id` | — |
| Authors can delete informative posts | authenticated | DELETE | `auth.uid() = author_id` | — |
| Authors can delete own informative posts | authenticated | DELETE | `auth.uid() = author_id` | — |

⚠️ **Duplicate policies** for INSERT, UPDATE, DELETE (same logic, different names). Harmless but hurts performance.

---

### `hr_events` — 2 policies

| Policy | Roles | Command | USING | WITH CHECK |
|--------|-------|---------|-------|------------|
| HR events are publicly readable | anon, authenticated | SELECT | `published = true` | — |
| Authenticated can insert hr events | authenticated | INSERT | — | `auth.uid() = author_id` |

❌ **No UPDATE or DELETE policies** — authors cannot edit or remove events via client API.

---

### `yearly_conferences` — 2 policies

| Policy | Roles | Command | USING | WITH CHECK |
|--------|-------|---------|-------|------------|
| Conferences are publicly readable | anon, authenticated | SELECT | `published = true` | — |
| Authenticated can insert conferences | authenticated | INSERT | — | `auth.uid() = author_id` |

❌ **No UPDATE or DELETE policies** — same gap as `hr_events`.

---

### RLS policy matrix summary

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| `posts` | Public (all rows) | Auth = author | Own rows | Own rows |
| `informative_posts` | Published only | Auth = author | Own rows | Own rows |
| `hr_events` | Published only | Auth = author | ❌ | ❌ |
| `yearly_conferences` | Published only | Auth = author | ❌ | ❌ |

**No admin override policies** (e.g. `is_admin()` bypass) on any table.

---

## 8. Security issues

### Critical / high

| # | Issue | Detail | Risk |
|---|-------|--------|------|
| 1 | **Open registration = full write access** | Any user who signs up can INSERT into all content tables and upload to all buckets | Unauthorized content publishing |
| 2 | **No role separation** | No admin vs author distinction; all authenticated users equal | Cannot restrict admin CMS to staff |
| 3 | **Blog posts always public** | `posts` SELECT policy is `true` with no `published` column | Draft posts would leak if added without schema+RLS change |
| 4 | **Storage upload not scoped** | Any authenticated user can upload to any bucket; no path/user ownership check | Storage abuse, orphaned files |
| 5 | **Public bucket listing** | All 4 buckets allow broad SELECT on `storage.objects` (Supabase advisor WARN) | Attackers can enumerate all uploaded files |
| 6 | **Credentials in client code** | Supabase URL + anon key hardcoded in `supabaseClient.js` (separate from DB, but related) | Key rotation difficulty; expected for anon key but still exposed |

### Medium

| # | Issue | Detail |
|---|-------|--------|
| 7 | **No UPDATE/DELETE on events/conferences** | Admin UI cannot fix mistakes via API; may lead to workarounds |
| 8 | **No storage DELETE policies** | Cannot clean up uploads through client; stale files accumulate |
| 9 | **Duplicate RLS policies** | `informative_posts` has 2× INSERT, 2× UPDATE, 2× DELETE policies |
| 10 | **Leaked password protection disabled** | HaveIBeenPwned check not enabled in Auth |
| 11 | **Frontend bypasses published filter** | `infoPublic.js` does not filter `published` (DB RLS protects anon, but authenticated users see drafts) |
| 12 | **No migration history** | `list_migrations` returned empty — schema changes not version-controlled in repo |
| 13 | **Unconfirmed org account** | `contact@mhra.mk` registered but email never confirmed |

### Low / performance (from Supabase advisors)

| # | Issue |
|---|-------|
| 14 | Unindexed FK columns on all 4 tables (`author_id`) |
| 15 | RLS policies use `auth.uid()` without `(select auth.uid())` wrapper — per-row re-evaluation |
| 16 | Multiple permissive policies on `informative_posts` for same role+action |

### Installed extensions

| Extension | Version |
|-----------|---------|
| `pgcrypto` | 1.3 |
| `uuid-ossp` | 1.1 |
| `pg_stat_statements` | 1.11 |
| `supabase_vault` | 0.3.1 |

No custom functions in `public` schema.

---

## 9. Missing structures for a professional blog/admin system

### Authentication & authorization

| Missing | Why it matters |
|---------|----------------|
| `profiles` table (`id`, `display_name`, `avatar_url`, `role`, `created_at`) | User identity beyond auth UUID |
| Role enum (`admin`, `editor`, `author`, `member`) | Separate CMS access from public authors |
| Role in `auth.users.raw_app_meta_data` or `profiles.role` | Enforce admin-only writes via RLS |
| `is_admin()` / `has_role()` SQL helper functions | Clean RLS policy expressions |
| Invite-only or admin-approved registration | Stop random sign-ups from publishing |
| Disable public sign-up; admin creates users | Standard for org CMS |

### Blog (`posts`) enhancements

| Missing | Why it matters |
|---------|----------------|
| `language` (`mk` / `en`) | Site is bilingual; blog is not |
| `published` boolean + `published_at` | Draft workflow |
| `updated_at` | Edit tracking |
| `slug` (unique per language) | SEO-friendly URLs |
| `excerpt` / `summary` | Card previews without truncating body |
| `status` enum (`draft`, `published`, `archived`) | Editorial workflow |
| `meta_title`, `meta_description` | SEO |
| RLS: SELECT only where `published = true` for anon | Match other content tables |
| Admin UPDATE/DELETE policies for editors | Staff moderation |

### Content management (all content tables)

| Missing | Why it matters |
|---------|----------------|
| UPDATE/DELETE RLS on `hr_events`, `yearly_conferences` | Admin edit/delete in UI |
| Admin override policies (`role = admin` can CRUD all) | Staff manage any author's content |
| `updated_at`, `updated_by` | Audit trail |
| `deleted_at` (soft delete) | Recoverable deletes |
| `sort_order` / `featured` flag | Homepage curation |
| Unified `content_posts` base table or shared view | Reduce duplicated schema/admin JS |

### Storage

| Missing | Why it matters |
|---------|----------------|
| Upload policies scoped to `{user_id}/` path prefix | Prevent cross-user overwrites |
| DELETE policy for own files or admin | Cleanup orphaned assets |
| MIME type restrictions per bucket | Block executable uploads |
| Private bucket + signed URLs for drafts | Unpublished media |
| `media_assets` table linking files to content rows | Referential integrity |

### Forms & engagement (site has mailto forms today)

| Missing | Why it matters |
|---------|----------------|
| `contact_submissions` table | Persist contact form data |
| `membership_applications` table | Track membership requests |
| `newsletter_subscribers` table | E-newsletter on activities page is static |
| Edge Function or RPC for form submission | Replace unreliable mailto |

### Audit & operations

| Missing | Why it matters |
|---------|----------------|
| `audit_log` / `content_revisions` | Who changed what and when |
| Supabase migrations in repo | Reproducible schema, CI/CD |
| Database backups policy documented | Disaster recovery |
| Seed data scripts | Dev/staging environments |

### Suggested target role model

```
admin     → full CRUD all tables, all storage, manage users
editor    → CRUD all content, cannot manage users
author    → CRUD own blog posts only
member    → read-only (future member portal)
anon      → read published content only
```

---

## Appendix A: Content authorship distribution

| Author (user id prefix) | posts | informative | hr_events | conferences |
|-------------------------|-------|-------------|-----------|-------------|
| `3cf9dcf8…` | 1 | 20 | 23 | 26 |
| `3dec11e8…` | 1 | — | — | — |
| `a203ec7e…` | — | 1 | — | — |

---

## Appendix B: Supabase security advisor findings

Full lint results captured during audit:

**Security (5 warnings):**
- Public bucket allows listing × 4 buckets
- Leaked password protection disabled

**Performance (17 notices):**
- Unindexed foreign keys × 4 tables
- Auth RLS initplan warnings × 10 policies
- Multiple permissive policies × 3 on `informative_posts`

Remediation links: [Supabase Database Linter](https://supabase.com/docs/guides/database/database-linter)

---

## Appendix C: Comparison — DB vs application code

| Area | Database | Application code | Gap |
|------|----------|------------------|-----|
| Informative published filter | RLS: `published = true` for anon | `infoPublic.js` skips filter | Authenticated users see drafts in UI |
| Blog published filter | No `published` column; SELECT = true | Shows all posts | No draft support anywhere |
| Admin edit events/conferences | No UPDATE/DELETE RLS | Admin UI is create-only | Cannot edit even if UI added |
| Author roles | None | Login page allows open signup | Anyone can become "author" |
| Storage ownership | Bucket-level only | Uploads use random filenames | No per-user isolation |

---

*End of audit report. No database changes were made.*
