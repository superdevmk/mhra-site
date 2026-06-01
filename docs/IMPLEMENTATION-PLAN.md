# MHRA Super Update — Phased Implementation Plan

> Based on `docs/PROJECT-BRIEFING.md`, `docs/DATABASE-AUDIT.md`, the local codebase, and Supabase MCP (project `lqhtqxuiahivairqaoeb`).  
> **Status:** Planning only — no implementation changes yet.

---

## Overview

| Phase | Focus | Depends on |
|-------|--------|------------|
| **1** | Supabase role system | — |
| **2** | Admin-only dashboard protection | Phase 1 |
| **3** | Public read-only blog | Phase 1–2 |
| **4** | Read More / popup fixes | — (can parallel Phase 3) |
| **5** | Rich text + inline images | Phase 2–3 |
| **6** | Mobile / desktop polish | Phases 3–5 |
| **7** | Remove Decap / Netlify | Phase 2 |

**Recommended order:** Phases 1 → 7. Phase 7 can run in parallel with Phase 6 but should not run before Phase 2.

---

## Phase 1 — Supabase role system

**Goal:** Replace flat “any authenticated user can publish” with `profiles.role` (`admin`, `editor`, `author`) and RLS helpers. Seed existing staff as admins before tightening policies in Phase 2.

### Files to change

| File | Change |
|------|--------|
| `assets/js/auth.js` | Add `getProfile()`, `getUserRole()`, `isStaff()` |
| `assets/js/supabaseClient.js` | Move URL/key to env injection pattern (optional here; required before prod) |
| `supabase/migrations/001_profiles_and_roles.sql` | **New** — schema + helpers (use MCP `apply_migration`) |
| `docs/DATABASE-AUDIT.md` | Update after migration (optional) |

No public HTML changes yet — DB-first.

### Supabase SQL (migration `001_profiles_and_roles`)

```sql
-- 1) Role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'editor', 'author');

-- 2) Profiles table
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  role public.app_role NOT NULL DEFAULT 'author',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3) Helpers (use (select auth.uid()) for performance)
CREATE OR REPLACE FUNCTION public.current_role()
RETURNS public.app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = (SELECT auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = (SELECT auth.uid()) AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'editor')
  );
$$;

-- 4) Auto-create profile on signup (default author)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    'author'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5) Seed profiles for EXISTING users (run once; adjust emails as needed)
INSERT INTO public.profiles (id, display_name, role)
SELECT
  u.id,
  split_part(u.email, '@', 1),
  CASE
    WHEN u.email IN (
      'alimiatdhe9@gmail.com',
      'superdev.mk@gmail.com',
      'mickoski.darko@yahoo.com',
      'contact@mhra.mk'
    ) THEN 'admin'::public.app_role
    ELSE 'author'::public.app_role
  END
FROM auth.users u
ON CONFLICT (id) DO UPDATE
SET role = EXCLUDED.role, updated_at = now();

-- 6) Profile RLS
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (id = (SELECT auth.uid()) OR public.is_admin());

CREATE POLICY "Admins can update profiles"
  ON public.profiles FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 7) Indexes (advisor fixes)
CREATE INDEX IF NOT EXISTS idx_posts_author_id ON public.posts(author_id);
CREATE INDEX IF NOT EXISTS idx_informative_posts_author_id ON public.informative_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_hr_events_author_id ON public.hr_events(author_id);
CREATE INDEX IF NOT EXISTS idx_yearly_conferences_author_id ON public.yearly_conferences(author_id);
CREATE INDEX IF NOT EXISTS idx_informative_posts_lang_pub ON public.informative_posts(language, published);
CREATE INDEX IF NOT EXISTS idx_hr_events_lang_pub ON public.hr_events(language, published);
CREATE INDEX IF NOT EXISTS idx_yearly_conferences_lang_pub ON public.yearly_conferences(language, published);
```

**Phase 2 will replace content RLS** — do not drop old policies until Phase 2 is ready.

### Risks

| Risk | Mitigation |
|------|------------|
| Existing users without profile rows break auth checks | Run seed `INSERT` before enabling strict RLS |
| Trigger creates `author` for every new signup | Phase 2 disables public signup; admins invite users |
| Wrong email promoted to `admin` | Verify seed list with MHRA team before running |
| `SECURITY DEFINER` functions | Keep `search_path = public`; review in Supabase advisor |

### Testing steps

1. MCP `execute_sql`: `SELECT id, email, role FROM auth.users u JOIN profiles p ON p.id = u.id;`
2. Confirm 4 staff emails are `admin`, others `author`.
3. Sign up a test user → profile auto-created with `author`.
4. MCP `get_advisors` type `security` — no new critical lints on `profiles`.
5. From browser: `supabaseClient.from('profiles').select('role').single()` while logged in as admin.

---

## Phase 2 — Admin-only dashboard protection

**Goal:** Only `admin`/`editor` can access `/admin/*` or mutate CMS content/storage. Lock down RLS and storage policies.

### Files to change

| File | Change |
|------|--------|
| `assets/js/adminGuard.js` | **New** — `requireStaffSession()`, redirect to admin login |
| `assets/js/auth.js` | Export role helpers used by guard |
| `admin/dashboard.html` | Use `adminGuard.js`; check `is_staff()` not just session |
| `admin/informative.html` | Add guard + sign-out link |
| `admin/events.html` | Add guard |
| `admin/conferences.html` | Add guard |
| `admin/login.html` | **New** — staff login (no public signup button) |
| `admin/index.html` | Temporary: redirect to `dashboard.html` (full replace in Phase 7) |
| `mk/login.html` | Remove signup OR redirect to “contact admin” message |
| `en/login.html` | Same |
| `assets/js/infoAdmin.js` | Pre-check `is_staff()` before submit |
| `assets/js/eventsAdmin.js` | Same |
| `assets/js/conferencesAdmin.js` | Same |
| `assets/js/posts.js` | Restrict create/delete to staff (when called from admin) |
| `vercel.json` | Optional: rewrite `/admin` → `/admin/dashboard.html` |

### Supabase SQL (migration `002_staff_only_rls`)

```sql
-- A) Remove duplicate informative_posts policies
DROP POLICY IF EXISTS "Authenticated users can create informative posts" ON public.informative_posts;
DROP POLICY IF EXISTS "Authenticated can insert informative posts" ON public.informative_posts;
DROP POLICY IF EXISTS "Authors can update informative posts" ON public.informative_posts;
DROP POLICY IF EXISTS "Authors can update own informative posts" ON public.informative_posts;
DROP POLICY IF EXISTS "Authors can delete informative posts" ON public.informative_posts;
DROP POLICY IF EXISTS "Authors can delete own informative posts" ON public.informative_posts;

-- B) Drop overly permissive policies on all content tables
DROP POLICY IF EXISTS "Authenticated users can create posts" ON public.posts;
DROP POLICY IF EXISTS "Authors can update own posts" ON public.posts;
DROP POLICY IF EXISTS "Authors can delete own posts" ON public.posts;
DROP POLICY IF EXISTS "Posts are publicly readable" ON public.posts;

DROP POLICY IF EXISTS "Authenticated can insert hr events" ON public.hr_events;
DROP POLICY IF EXISTS "HR events are publicly readable" ON public.hr_events;

DROP POLICY IF EXISTS "Authenticated can insert conferences" ON public.yearly_conferences;
DROP POLICY IF EXISTS "Conferences are publicly readable" ON public.yearly_conferences;

DROP POLICY IF EXISTS "Informative posts are publicly readable" ON public.informative_posts;

-- C) Public read (published only)
CREATE POLICY "Public read published posts"
  ON public.posts FOR SELECT TO anon, authenticated
  USING (published = true);  -- requires Phase 3 column; use TRUE temporarily if not yet added

CREATE POLICY "Public read published informative posts"
  ON public.informative_posts FOR SELECT TO anon, authenticated
  USING (published = true);

CREATE POLICY "Public read published hr events"
  ON public.hr_events FOR SELECT TO anon, authenticated
  USING (published = true);

CREATE POLICY "Public read published conferences"
  ON public.yearly_conferences FOR SELECT TO anon, authenticated
  USING (published = true);

-- D) Staff write (admin + editor)
CREATE POLICY "Staff insert posts"
  ON public.posts FOR INSERT TO authenticated
  WITH CHECK (public.is_staff() AND author_id = (SELECT auth.uid()));

CREATE POLICY "Staff update posts"
  ON public.posts FOR UPDATE TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

CREATE POLICY "Staff delete posts"
  ON public.posts FOR DELETE TO authenticated
  USING (public.is_staff());

CREATE POLICY "Staff insert informative posts"
  ON public.informative_posts FOR INSERT TO authenticated
  WITH CHECK (public.is_staff() AND author_id = (SELECT auth.uid()));

CREATE POLICY "Staff update informative posts"
  ON public.informative_posts FOR UPDATE TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE POLICY "Staff delete informative posts"
  ON public.informative_posts FOR DELETE TO authenticated
  USING (public.is_staff());

CREATE POLICY "Staff insert hr events"
  ON public.hr_events FOR INSERT TO authenticated
  WITH CHECK (public.is_staff() AND author_id = (SELECT auth.uid()));

CREATE POLICY "Staff update hr events"
  ON public.hr_events FOR UPDATE TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE POLICY "Staff delete hr events"
  ON public.hr_events FOR DELETE TO authenticated
  USING (public.is_staff());

CREATE POLICY "Staff insert conferences"
  ON public.yearly_conferences FOR INSERT TO authenticated
  WITH CHECK (public.is_staff() AND author_id = (SELECT auth.uid()));

CREATE POLICY "Staff update conferences"
  ON public.yearly_conferences FOR UPDATE TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE POLICY "Staff delete conferences"
  ON public.yearly_conferences FOR DELETE TO authenticated
  USING (public.is_staff());

-- E) Staff-only draft visibility
CREATE POLICY "Staff read all posts"
  ON public.posts FOR SELECT TO authenticated
  USING (public.is_staff());

-- F) Storage: replace broad upload policies
DROP POLICY IF EXISTS "Authenticated users can upload blog images bjsgsj_0" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can upload informative assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can upload events assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can upload conferences assets" ON storage.objects;

CREATE POLICY "Staff upload blog images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'blog-images' AND public.is_staff());

CREATE POLICY "Staff upload informative assets"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'informative-assets' AND public.is_staff());

CREATE POLICY "Staff upload events assets"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'events-assets' AND public.is_staff());

CREATE POLICY "Staff upload conferences assets"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'conferences-assets' AND public.is_staff());

CREATE POLICY "Staff delete own bucket objects"
  ON storage.objects FOR DELETE TO authenticated
  USING (public.is_staff());
```

**Dashboard setting (Supabase Auth dashboard, not SQL):** disable public sign-ups (`Authentication → Providers → Email → Confirm email ON`, `Enable sign ups OFF`).

### Risks

| Risk | Mitigation |
|------|------------|
| Lockout if no admin seeded | Keep one service-role session; verify seed before deploy |
| Phase 2 SQL references `posts.published` before Phase 3 adds it | Add column in same migration OR use `USING (true)` temporarily |
| Staff blocked from uploads mid-session | Force re-login after role migration |
| Client-side guard bypassable | RLS is real enforcement; guard is UX only |

### Testing steps

1. **Anon:** open `/admin/informative.html` → redirected to admin login.
2. **Author account:** login → guard rejects → no insert via Supabase client.
3. **Admin account:** full CRUD on all 4 tables via admin forms.
4. **Non-staff upload:** storage insert fails with RLS error.
5. MCP `execute_sql`: `SELECT policyname, cmd FROM pg_policies WHERE schemaname='public';` — no duplicate informative policies.
6. MCP `get_advisors` security — bucket listing warnings may remain (address in Phase 5/6).

---

## Phase 3 — Public blog for normal users

**Goal:** Blog pages are **read-only** for visitors. Authoring moves to admin. Bilingual posts with publish/draft.

### Files to change

| File | Change |
|------|--------|
| `mk/blog.html` | Remove `#create-post-section`, `#author-btn` login, author modal delete |
| `en/blog.html` | Same |
| `assets/js/blog.js` | Public read-only: load + modal only; filter by `language` + `published` |
| `assets/js/posts.js` | `fetchPosts({ language, publishedOnly })`; staff CRUD stays for admin use |
| `admin/blog.html` | **New** — staff blog CMS (create/edit/delete, draft toggle) |
| `admin/dashboard.html` | Add link to `blog.html` |
| `assets/js/blogAdmin.js` | **New** — admin blog form (or extend `posts.js`) |
| `mk/login.html` | Remove blog redirect; point staff to `/admin/login.html` |
| `en/login.html` | Same |

### Supabase SQL (migration `003_blog_public_schema`)

```sql
-- Extend posts for bilingual public blog
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'mk',
  ADD COLUMN IF NOT EXISTS published boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS excerpt text,
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS published_at timestamptz;

-- Backfill existing rows
UPDATE public.posts SET language = 'mk', published = true, published_at = created_at WHERE published_at IS NULL;

-- Slugs from title (manual review recommended)
UPDATE public.posts
SET slug = lower(regexp_replace(regexp_replace(title, '[^a-zA-Z0-9]+', '-', 'g'), '(^-|-$)', '', 'g'))
WHERE slug IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_posts_slug_lang ON public.posts(language, slug);
CREATE INDEX IF NOT EXISTS idx_posts_lang_pub_created ON public.posts(language, published, created_at DESC);

-- Language constraint
ALTER TABLE public.posts
  ADD CONSTRAINT posts_language_check CHECK (language IN ('mk', 'en'));

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER posts_set_updated_at
  BEFORE UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
```

If Phase 2 not deployed yet, combine `002` + `003` in one migration.

### Risks

| Risk | Mitigation |
|------|------------|
| Existing 2 posts lack language | Default `mk`; manually tag EN if needed |
| Slug collisions | Review generated slugs; append `-2` on conflict |
| Users expect old “author login” on blog | Add brief notice linking to public site only |

### Testing steps

1. **Logged out:** `/mk/blog.html` shows posts; no create UI; no login button.
2. **Filter:** MK page shows only `language=mk`; EN page only `en`.
3. **Draft:** set `published=false` in admin → post hidden from public, visible to staff.
4. **Anon Supabase client:** `select * from posts where published=false` returns 0 rows.
5. Cross-check nav: blog link works MK/EN; language switch shows correct subset.

---

## Phase 4 — Read More / popup fixes

**Goal:** Fix broken home informative modals, unify modal behavior, remove dead code, fix asset paths.

### Root causes (from codebase)

| Bug | Location |
|-----|----------|
| Home uses `#content-modal`; `infoPublic.js` expects `#info-modal` | `mk/index.html`, `en/index.html` |
| `about.html` loads `infoPublic.js` before `supabaseClient.js` | `mk/about.html`, `en/about.html` |
| Events pages use `/assets/...` absolute paths | `mk/events.html`, `en/events.html` |
| Dead legacy modal JS (no `.modal` elements) | `mk/events.html`, `en/events.html` |
| `infoPublic.js` skips `published` filter (RLS covers anon; staff see drafts) | `assets/js/infoPublic.js` |
| Duplicate modal CSS blocks | `assets/css/style.css` |

### Files to change

| File | Change |
|------|--------|
| `assets/js/modal.js` | **New** — shared open/close/gallery for one modal contract |
| `assets/js/infoPublic.js` | Use `modal.js`; filter `published=true`; support unified modal |
| `assets/js/contentPublic.js` | Use `modal.js`; share `#content-modal` markup contract |
| `mk/index.html` | Add `#info-modal` block OR point infoPublic at `#content-modal` |
| `en/index.html` | Same; fix `year-home-mk` → `year-home-en` |
| `mk/about.html` | Fix script order: supabase CDN → `supabaseClient.js` → `infoPublic.js` |
| `en/about.html` | Same |
| `mk/events.html` | Change `/assets/` → `../assets/`; remove dead modal `<script>` block |
| `en/events.html` | Same |
| `assets/css/style.css` | Consolidate duplicate `.info-modal` rules; fix mobile scroll trap |

**Recommended approach:** One modal component (`#content-modal`) everywhere; refactor `infoPublic.js` to target `#content-modal` IDs like `contentPublic.js`.

### Supabase SQL

**None required** — RLS already filters `published=true` for anon on informative/events/conferences.

### Risks

| Risk | Mitigation |
|------|------------|
| Two modals on same page conflict | Use single modal per page |
| Gallery track ID collision when both scripts load on home | Single track element per page |
| XSS via `innerHTML` body | Defer sanitization to Phase 5 |

### Testing steps

1. **Home MK/EN:** click “Read more” on informative card → modal opens with title, body, images.
2. **About page:** same behavior; carousel prev/next works.
3. **Events / galleries:** content cards open modal with gallery.
4. **Mobile 375px:** modal scrolls; close on backdrop/Escape.
5. **Console:** no `supabaseClient is not defined` on any page.
6. **Draft post:** invisible on home for anon (after Phase 2 RLS).

---

## Phase 5 — Rich text with inline images

**Goal:** Staff CMS uses a WYSIWYG editor; body stores sanitized HTML with inline images uploaded to Supabase Storage.

### Recommended stack (no build step)

- **Editor:** Quill via CDN (lightweight, image embed support)
- **Sanitize:** DOMPurify on public render
- **Storage:** new bucket `content-media` or reuse `informative-assets` with `{table}/{id}/` paths

### Files to change

| File | Change |
|------|--------|
| `assets/js/richEditor.js` | **New** — init Quill, image handler → storage upload |
| `assets/js/renderContent.js` | **New** — `renderHtmlBody()` with DOMPurify |
| `admin/informative.html` | Replace `<textarea name="body">` with Quill container |
| `admin/events.html` | Same |
| `admin/conferences.html` | Same |
| `admin/blog.html` | Quill for blog body |
| `assets/js/infoAdmin.js` | Read Quill HTML; store in `body` |
| `assets/js/eventsAdmin.js` | Same |
| `assets/js/conferencesAdmin.js` | Same |
| `assets/js/blogAdmin.js` | Same |
| `assets/js/infoPublic.js` | Render HTML via DOMPurify instead of `replace(/\n/g,'<br>')` |
| `assets/js/contentPublic.js` | Same |
| `assets/js/blog.js` | Render HTML in modal (replace raw `marked` for new posts) |
| `assets/css/style.css` | `.ql-editor`, `.content-body img { max-width:100% }` |

### Supabase SQL (migration `004_rich_content`)

```sql
-- Track content format (backward compatible)
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS body_format text NOT NULL DEFAULT 'markdown'
    CHECK (body_format IN ('markdown', 'html'));

ALTER TABLE public.informative_posts
  ADD COLUMN IF NOT EXISTS body_format text NOT NULL DEFAULT 'plain'
    CHECK (body_format IN ('plain', 'html'));

ALTER TABLE public.hr_events
  ADD COLUMN IF NOT EXISTS body_format text NOT NULL DEFAULT 'plain'
    CHECK (body_format IN ('plain', 'html'));

ALTER TABLE public.yearly_conferences
  ADD COLUMN IF NOT EXISTS body_format text NOT NULL DEFAULT 'plain'
    CHECK (body_format IN ('plain', 'html'));

-- Optional dedicated media bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('content-media', 'content-media', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read content media"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'content-media');

CREATE POLICY "Staff upload content media"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'content-media' AND public.is_staff());

CREATE POLICY "Staff delete content media"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'content-media' AND public.is_staff());

UPDATE storage.buckets
SET allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','image/gif']
WHERE id IN ('content-media','blog-images','informative-assets','events-assets','conferences-assets');
```

### Risks

| Risk | Mitigation |
|------|------------|
| XSS if DOMPurify skipped | Never use raw `innerHTML` without sanitize |
| Large inline images bloat HTML | Resize client-side or max 2MB upload |
| Old plain-text posts render wrong | `body_format` switch: plain → `<br>` fallback |
| Quill CDN blocked offline | Pin version in script URL |

### Testing steps

1. Admin: create post with bold, list, inline image → save → reload admin form.
2. Public: modal/blog shows formatted HTML; images load.
3. Attempt `<script>alert(1)</script>` in editor → stripped on render.
4. Storage: object appears under `content-media/`; non-staff upload fails.
5. Existing 21+ informative posts still display (plain fallback).

---

## Phase 6 — Mobile / desktop polish

**Goal:** Consistent responsive UX across public site and admin.

### Files to change

| File | Change |
|------|--------|
| `assets/css/style.css` | Nav mobile menu, modal full-screen mobile, blog grid, admin forms, sponsor carousel |
| `assets/js/main.js` | Close nav on link click; focus trap in modals (optional) |
| `admin/dashboard.html` | Responsive admin card grid |
| `admin/informative.html` | Stack form fields; scrollable table |
| `admin/events.html` | Same |
| `admin/conferences.html` | Same |
| `admin/blog.html` | Same |
| `mk/index.html` | Hero spacing, section padding audit |
| `en/index.html` | Same |
| All `mk/*.html`, `en/*.html` | Footer link fixes (`href="#"` → real pages or remove) |

### Supabase SQL

**None** — UI-only phase.

Optional: enable leaked password protection via Dashboard → Auth → Password Security.

### Risks

| Risk | Mitigation |
|------|------------|
| CSS regressions on desktop | Test breakpoints: 375, 768, 1024, 1440 |
| Quill toolbar overflow on mobile | Collapse toolbar or bottom sheet |
| Touch carousel conflicts with modal scroll | `touch-action` CSS |

### Testing steps

1. **Chrome DevTools:** iPhone SE, iPad, desktop — every main route.
2. Admin forms usable on phone.
3. Modal: no body scroll bleed; close button ≥44px tap target.
4. Sponsor carousel + events carousel animate without layout shift.
5. Lighthouse mobile score baseline before/after (informational).

---

## Phase 7 — Remove Decap / Netlify leftovers

**Goal:** Single CMS path (Supabase admin). Clean deploy config.

### Files to change

| File | Action |
|------|--------|
| `admin/index.html` | Replace Decap UI with meta-refresh to `dashboard.html` |
| `admin/config.yml` | **Delete** |
| `blog/hr-trends-2025.md` | **Delete** |
| `blog/` folder | **Delete** if empty |
| `index.html` | Remove Netlify Identity scripts; keep redirect to `mk/index.html` |
| `_redirects` | **Delete** (Netlify-only) |
| `vercel.json` | Add admin rewrite (see below) |
| `docs/PROJECT-BRIEFING.md` | Update architecture section |

### Target `vercel.json`

```json
{
  "rewrites": [
    { "source": "/", "destination": "/mk/index.html" },
    { "source": "/admin", "destination": "/admin/dashboard.html" }
  ]
}
```

### Supabase SQL

**None.**

### Risks

| Risk | Mitigation |
|------|------------|
| Bookmark to `/admin/` expected Decap | Redirect to dashboard |
| Someone still using Netlify Identity | Confirm no production dependency |
| `_redirects` removal breaks Netlify deploy if dual-hosted | Confirm Vercel-only hosting |

### Testing steps

1. `/admin/` → lands on Supabase dashboard (not Decap).
2. Root `index.html` — no Netlify scripts in network tab.
3. Grep repo: `netlify`, `decap`, `nc-root`, `git-gateway` → zero hits.
4. Vercel preview deploy succeeds with no `_redirects`.
5. Public blog still loads from Supabase `posts`.

---

## Cross-phase checklist (before production cutover)

| Item | Phase |
|------|-------|
| Seed admin roles for MHRA staff | 1 |
| Disable public Auth signup | 2 |
| Move Supabase keys out of `supabaseClient.js` | 1 or 2 |
| Enable HaveIBeenPwned password check | 2 (dashboard) |
| Consolidate `infoAdmin.js` / `eventsAdmin.js` / `conferencesAdmin.js` → `contentAdmin.js` | 2 or 5 |
| Add admin edit/delete UI for existing rows | 2 |
| MCP `get_advisors` after each migration | All SQL phases |

---

## Suggested timeline

| Week | Phases |
|------|--------|
| 1 | 1 + 2 (security foundation) |
| 2 | 3 + 4 (public UX fixes) |
| 3 | 5 (editor) |
| 4 | 6 + 7 (polish + cleanup) |

---

## What to run first (action order)

1. MCP `apply_migration` — Phase 1 SQL
2. Verify admin seed
3. MCP `apply_migration` — Phase 2 SQL + disable public signup in dashboard
4. Deploy Phase 2 frontend (`adminGuard.js`, admin login)
5. Continue phases 3 → 7

---

## Related docs

- [PROJECT-BRIEFING.md](./PROJECT-BRIEFING.md)
- [DATABASE-AUDIT.md](./DATABASE-AUDIT.md)
