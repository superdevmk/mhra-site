# MHRA Site — Project Briefing

> Generated from codebase analysis. Based on the files in this repository only (no Supabase/Vercel dashboard access).

---

## What this project is

A **static, bilingual website** for the **Macedonian Human Resources Association (МАЧР / MHRA)** — a professional HR community site with news, events, conferences, blog, membership, and contact pages.

There is **no build toolchain**: no `package.json`, no framework, no serverless/API layer. It is plain **HTML + CSS + vanilla JavaScript**, with dynamic content loaded client-side from **Supabase**. Deployment is configured for **Vercel** as a static site, with leftover **Netlify / Decap CMS** artifacts from an earlier setup.

---

## Project structure

```
mhra-site/
├── index.html              # Root redirect → mk/index.html (+ Netlify Identity)
├── vercel.json             # Vercel rewrite: / → /mk/index.html
├── _redirects              # Netlify-style redirects (not used by Vercel)
├── mk/                     # Macedonian pages (default language)
├── en/                     # English pages
├── admin/                  # CMS / content admin
├── assets/
│   ├── css/style.css
│   ├── js/                 # All app logic (13 JS files)
│   └── img/                # Logos, banners, sponsor logos, etc.
└── blog/
    └── hr-trends-2025.md   # Sample Decap CMS markdown post (not used by live blog)
```

**Config files present:** `vercel.json`, `_redirects`, `admin/config.yml` (Decap CMS).

**No:** `package.json`, `.env`, README, build scripts, or backend functions.

---

## Pages and routes

### Root

| URL | File | Behavior |
|-----|------|----------|
| `/` | `vercel.json` rewrite → `/mk/index.html` | MK homepage |
| `/index.html` | `index.html` | Meta-refresh to `mk/index.html` |

### Public — Macedonian (`/mk/`)

| Page | File | Dynamic data |
|------|------|--------------|
| Home | `mk/index.html` | Supabase: informative posts, yearly conferences, HR events carousel, sponsors |
| Informative content | `mk/about.html` | Supabase: `informative_posts` |
| Educational content | `mk/activities.html` | Static only |
| Yearly conference | `mk/galleries.html` | Supabase: `yearly_conferences` |
| HR events | `mk/events.html` | Supabase: `hr_events` |
| Blog | `mk/blog.html` | Supabase: `posts` + auth |
| Contact | `mk/contact.html` | Mailto form |
| Membership | `mk/membership.html` | Mailto forms |
| Author login | `mk/login.html` | Supabase Auth |

### Public — English (`/en/`)

Same set of pages as MK, mirrored under `/en/`.

Language switching is manual via nav links (`../mk/...` ↔ `../en/...`). Content language is driven by `<html lang="mk|en">` in each page.

### Admin

| URL | File | Purpose |
|-----|------|---------|
| `/admin/` or `/admin/index.html` | `admin/index.html` | **Decap CMS** (Netlify Identity + git-gateway) |
| `/admin/dashboard.html` | `admin/dashboard.html` | Supabase admin hub (auth-guarded) |
| `/admin/informative.html` | `admin/informative.html` | Create `informative_posts` |
| `/admin/events.html` | `admin/events.html` | Create `hr_events` |
| `/admin/conferences.html` | `admin/conferences.html` | Create `yearly_conferences` |

`dashboard.html` is **not linked** from any public page in the codebase.

---

## Main features

### Public website

- **Shared layout:** header nav, footer, mobile menu, scroll-reveal animations (`main.js`)
- **Home:** hero, HR events carousel, informative posts grid, yearly conference preview, sponsors marquee
- **Informative / educational / projects:** mix of Supabase-driven and **static placeholder** content (awards, projects, e-newsletter list on `activities.html`)
- **Yearly conferences & HR events:** cards loaded from Supabase with modal “read more” and image gallery
- **Blog:** public listing from Supabase; logged-in authors can create/delete their own posts
- **Membership:** individual + corporate forms → **`mailto:contact@mhra.mk`** (no backend)
- **Contact:** form → **`mailto:contact@mhra.mk`** via `data-mail-form` in `main.js`
- **Newsletter:** static list only on activities pages — **no signup form, no API**

### Admin / content management

Two parallel systems exist:

1. **Supabase admin** (active for live site content)
   - Login via `mk/login.html` / `en/login.html`
   - Dashboard + 3 admin forms for informative posts, HR events, yearly conferences
   - Upload images to Supabase Storage, insert rows into DB
   - **Create only** — no edit/delete UI in admin

2. **Decap CMS** (legacy)
   - `admin/index.html` + `admin/config.yml`
   - Uses **Netlify Identity** + **git-gateway**
   - Manages markdown in `blog/` folder
   - **Not connected** to the public blog page, which reads from Supabase `posts` instead

### Forms summary

| Form | Mechanism | Recipient |
|------|-----------|-----------|
| Contact | `mailto:` | `contact@mhra.mk` |
| Membership (individual/corporate) | `mailto:` | `contact@mhra.mk` |
| Blog create | Supabase insert | N/A |
| Admin content forms | Supabase insert + Storage upload | N/A |
| `data-demo-form` | Alert demo message | Defined in `main.js` but **no HTML uses it** |

### Routing behavior

- **Vercel:** `/` → `/mk/index.html` (via `vercel.json`)
- **Netlify `_redirects`:** `/admin/*` → `/admin/index.html`; `/blog/*` passthrough — **ignored on Vercel** unless separately configured
- **No client-side router** — each page is a standalone HTML file
- **No API routes or serverless functions**

---

## Supabase integration

### Client configuration

Configured in `assets/js/supabaseClient.js`:

- **URL:** `https://lqhtqxuiahivairqaoeb.supabase.co`
- **Key:** hardcoded publishable/anon key (`sb_publishable_...`)
- Loaded via CDN: `@supabase/supabase-js@2`
- **No environment variables** — credentials are committed in source

### Tables (inferred from code)

| Table | Used for | Key columns |
|-------|----------|-------------|
| `posts` | Blog | `id`, `title`, `body`, `image_url`, `created_at`, `author_id` |
| `informative_posts` | News / informative content | `language`, `title`, `subtitle`, `body`, `images[]`, `published`, `author_id`, `created_at` |
| `hr_events` | HR events | Same as above + `event_date`, `location` |
| `yearly_conferences` | Annual conference | Same shape as informative posts |

### Storage buckets

| Bucket | Used by |
|--------|---------|
| `blog-images` | Blog post images (`{userId}/{filename}`) |
| `informative-assets` | Informative admin uploads |
| `events-assets` | HR events admin uploads |
| `conferences-assets` | Conferences admin uploads |

All uploads use `getPublicUrl()` — **public buckets assumed**.

### Authentication

- **Email/password** via `assets/js/auth.js` (`signUp`, `signIn`, `signOut`, `getSession`)
- **Blog:** any registered user can sign up and publish (`login.html` has open registration)
- **Admin dashboard:** redirects to login if no session (`dashboard.html` only)
- **Admin form pages** (`informative.html`, `events.html`, `conferences.html`): check auth only at submit time via `getUser()` — **no page-level redirect**

### RLS assumptions visible in code

- Public reads on `yearly_conferences` and `hr_events` filter `published = true` and `language`
- `informative_posts` public loader (`infoPublic.js`) does **not** filter by `published` — all rows for that language are shown
- `posts` are fetched without auth (public read)
- `createPost` / `deletePost` comments expect RLS to restrict writes/deletes to authenticated users; delete limited to author
- Admin inserts require authenticated `author_id` — **enforcement must be in Supabase RLS**, not in this repo

---

## Deployment (Vercel)

| Setting | Value |
|---------|-------|
| Build command | None (static files served as-is) |
| Output | Repository root (no `dist/` folder) |
| Env vars | None defined; Supabase keys hardcoded |
| Rewrites | `/` → `/mk/index.html` |
| Domain config | Not present in repo |

**Likely flow:** connect repo to Vercel → deploy static files → root serves MK homepage.

**Netlify leftovers** that may not work on Vercel without extra setup:

- `_redirects`
- Netlify Identity on `index.html` and `admin/index.html`
- Decap CMS `git-gateway` backend in `admin/config.yml`

---

## What needs attention

### High priority

1. **Two CMS systems** — Decap/Netlify (`admin/index.html`, `blog/*.md`) vs Supabase (`posts` table). Public blog uses Supabase only; Decap path appears obsolete.
2. **Admin security** — Only `dashboard.html` enforces login. Admin form URLs are reachable without redirect. Open author self-registration on login pages.
3. **Credentials in source** — Supabase URL/key hardcoded in `supabaseClient.js`; should use env vars at build time or a thin config layer.
4. **Unpublished informative posts may leak** — `infoPublic.js` does not filter `published = true`.
5. **Home page modal mismatch** — Home uses `#content-modal` but `infoPublic.js` expects `#info-modal`. “Read more” on home informative cards likely does not open a modal.

### Medium priority

6. **`/assets/...` absolute paths** on `mk/events.html` and `en/events.html` vs `../assets/...` elsewhere — can break depending on deploy path.
7. **Dead code on events pages** — Inline modal JS references `[data-modal-target]` and `.modal` elements that no longer exist in HTML.
8. **`dashboard.html` orphaned** — No navigation links to the Supabase admin hub.
9. **Admin CRUD incomplete** — Create-only; no edit, delete, or unpublish in UI.
10. **Duplicated admin JS** — `infoAdmin.js`, `eventsAdmin.js`, and `conferencesAdmin.js` are nearly identical (~150 lines each).
11. **XSS surface** — Post `body` rendered via `innerHTML` without sanitization in modals.
12. **Email inconsistency** — Contact page shows `info@mhra.mk`; forms mailto `contact@mhra.mk`.

### Lower priority / content

13. **Broken footer links** — Privacy policy and terms are `href="#"` on all pages.
14. **Placeholder content** — Membership fee `[пример износ]`, sample projects/awards/newsletters on activities pages.
15. **Wrong element IDs on EN home** — Footer year span uses `year-home-mk` on the English page.
16. **`blog/hr-trends-2025.md`** — Sample file unused by live blog.
17. **No README or env documentation** for onboarding or deployment.

---

## Recommended next steps

1. **Pick one content stack** — Either fully commit to Supabase (remove Decap/Netlify Identity) or document and wire Decap if still needed. Remove unused `blog/*.md` path or connect it to the public blog.
2. **Harden admin access** — Add auth redirect to all `/admin/*.html` Supabase pages; disable public signup or restrict to admin-approved emails/roles in Supabase.
3. **Move Supabase config to environment variables** — Use Vercel env vars and inject at deploy (or a small build step).
4. **Fix public content bugs** — Add `info-modal` to home pages (or unify modal IDs); filter `informative_posts` by `published`; standardize asset paths.
5. **Complete admin UX** — Link to `dashboard.html`, add edit/delete/unpublish, consolidate the three admin JS files.
6. **Replace mailto forms** — Contact and membership need a real backend (Supabase Edge Function, Formspree, etc.) if reliable delivery matters.
7. **Clean deployment config** — Remove or migrate `_redirects` and Netlify Identity; add Vercel rewrites for `/admin/*` if SPA-style admin routing is needed.
8. **Content and legal pages** — Replace placeholders; add real privacy/terms pages.
9. **Verify Supabase RLS and Storage policies** in the Supabase dashboard (not visible in this repo) — especially for open registration + public buckets.

---

## Key source files reference

| Area | Files |
|------|-------|
| Supabase client | `assets/js/supabaseClient.js` |
| Auth | `assets/js/auth.js` |
| Blog | `assets/js/posts.js`, `assets/js/blog.js` |
| Public content | `assets/js/infoPublic.js`, `assets/js/contentPublic.js`, `assets/js/eventsCarousel.js` |
| Admin content | `assets/js/infoAdmin.js`, `assets/js/eventsAdmin.js`, `assets/js/conferencesAdmin.js` |
| Shared UI | `assets/js/main.js`, `assets/js/sponsorsCarousel.js` |
| Styles | `assets/css/style.css` |
| Deploy config | `vercel.json`, `_redirects` |
| Legacy CMS | `admin/index.html`, `admin/config.yml` |
