# NeuroSearch AI — Agent Implementation Log

---

## Phase 1 — Connectivity Pre-fixes (prior session)

### `.env` — Stub environment variables added
Added `SUPABASE_SERVICE_ROLE_KEY`, `INTERNAL_API_BASE_URL`, and `INTERNAL_API_TOKEN` as commented-out stubs so the project would not crash on missing keys during development.

### `.gitignore` — Protected `.env`
Added `.env` to `.gitignore` to prevent accidental secret commits.

---

## Phase 2 — Full Supabase → Node + MongoDB + Redis Migration

**Specification**: `claude.md`  
**Build verified**: `npx tsc --noEmit` → 0 errors after all fixes

---

### §1 — Removal

| Action | Detail |
|--------|--------|
| **Deleted directories** | `src/routes/api/admin/` (9 proxy route files), `src/routes/api/public/` (delete-account proxy), `src/integrations/supabase/`, `src/integrations/lovable/`, `supabase/` (migrations + config) |
| **Deleted files** | `src/lib/admin-server.ts`, `src/lib/admin-infra-api.ts` |
| **Cleaned `.env`** | Removed all `SUPABASE_*` / `INTERNAL_*` vars; added single `VITE_API_BASE_URL=http://localhost:5000` |
| **Uninstalled packages** | `@supabase/supabase-js`, `@lovable.dev/cloud-auth-js` — removed from `node_modules` and `package.json` |

---

### §2 — New client: `src/lib/api-client.ts` (NEW FILE)

Single fetch wrapper for all Node backend calls.

**Key design decisions:**
- All requests use `credentials: "include"` — browser sends the httpOnly cookie automatically
- No `Authorization` header anywhere — cookie is the auth mechanism
- Core `request<T>()` helper: handles non-OK responses by parsing `{ message, error }` from Node error body; re-throws as `Error`
- 204 No Content responses return `undefined` safely
- Grouped namespaces: `api.auth`, `api.profiles`, `api.searchHistory`, `api.savedDatasets`, `api.collections`, `api.socialLinks`, `api.account`, `api.admin.*`
- `api.BASE_URL` exported for EventSource SSE construction
- **Every Node path annotated with `// TODO: confirm Node path`** — all paths follow REST conventions but must be verified against the actual Node router before production deployment
- **Fixed post-migration**: renamed two `patch` parameters that shadowed the outer `patch()` HTTP helper (TS2349)

---

### §3 — Auth

| File | Change |
|------|--------|
| **`src/lib/auth-context.tsx`** | Complete rewrite. `AuthProvider` now calls `api.auth.me()` on mount (GET cookie-based session check). No Supabase subscription. Exported shape identical to before (`user`, `session`, `profile`, `loading`, `refreshProfile`, `signOut`). `signOut()` calls `api.auth.logout()` then navigates home. |
| **`src/routes/auth.tsx`** | Complete rewrite. Login/signup forms use `api.auth.login()` / `api.auth.signup()`. Google OAuth clicks redirect browser to `VITE_API_BASE_URL/auth/google` (Node handles callback + cookie set). Removed all Supabase/Lovable imports. |
| **`src/routes/_authenticated/route.tsx`** | Auth guard re-enabled. Calls `api.auth.me()` in `beforeLoad`; throws redirect to `/auth` if no valid session. Replaced "Demo mode" no-op stub. |
| **`src/routes/admin/route.tsx`** | Admin guard re-enabled. Calls `api.auth.me()`, checks `user.isAdmin` field from Node JWT payload. Non-admins redirect to `/`. Unauthenticated users redirect to `/auth`. |

---

### §4 — Call-site migration (user-facing routes)

| File | Supabase calls replaced |
|------|------------------------|
| `src/routes/_authenticated/history.tsx` | `supabase.from("search_history").select/delete` → `api.searchHistory.list()`, `clearAll()`, `deleteOne(id)` |
| `src/routes/_authenticated/onboarding.tsx` | `supabase.from("profiles").update` → `api.profiles.update(data)`. Also removed stale `user.user_metadata` reference (not present on `AuthUser`). |
| `src/routes/_authenticated/saved.tsx` | `supabase.from("saved_datasets")` + `supabase.from("collections")` → `api.savedDatasets.list/delete`, `api.collections.list/create/delete` |
| `src/routes/_authenticated/settings.tsx` | Social links read/upsert/delete, profile update (×2), toggle notifications, and the old `/api/public/delete-account` fetch (with Bearer header) → all replaced with `api.socialLinks.*`, `api.profiles.update`, `api.account.delete()` |
| `src/routes/dataset.$id.tsx` | `supabase.from("saved_datasets").upsert` → `api.savedDatasets.upsert(...)` |

---

### §5 — SSE: `src/routes/search.tsx` (complete rewrite)

**Before**: static mock data array rendered on page load.

**After**:
- `useEffect` opens `new EventSource(VITE_API_BASE_URL/search/stream?q=..., { withCredentials: true })` whenever `search.q` changes
- Results render **incrementally** as SSE frames arrive — each `event.data` is parsed as a `SearchResult` and appended to state
- `es.onerror` fires when the server closes the stream (normal EOF) → sets `streaming = false`
- Previous stream is `.close()`d on re-search or unmount (no leak)
- Search history insert (`api.searchHistory.insert`) fires fire-and-forget for signed-in users
- Save button uses `api.savedDatasets.upsert`

---

### §4 (continued) — Call-site migration (admin routes)

All admin pages had three patterns replaced:

1. **Supabase direct reads** → `api.admin.*` read methods
2. **TanStack server-side proxy fetches** (`fetch('/api/admin/...')` with `Authorization: Bearer <supabase-token>`) → `api.admin.*` methods (cookie is automatic)
3. **`bearer()` helper** (`supabase.auth.getSession()`) → deleted entirely from every file

| File | Detail |
|------|--------|
| `admin/index.tsx` | 4 parallel Supabase queries → single `api.admin.dashboard()` call |
| `admin/users.tsx` | profiles list query + `call()` proxy helper → `api.admin.users.list/update/delete` |
| `admin/repositories.tsx` | Supabase read + 3 proxy fetches (add/resync/remove) → `api.admin.repositories.list/create/resync/delete` |
| `admin/moderation.tsx` | 2 Supabase list queries + 2 proxy fetches (approve/reject) → `api.admin.moderation.queue/published/approve/reject` |
| `admin/announcements.tsx` | Supabase list + insert/update/delete → `api.admin.announcements.list/create/toggle/delete`. Also removed `useAuth` import (user.id no longer sent in body — Node derives from cookie). |
| `admin/audit-log.tsx` | Supabase select → `api.admin.auditLog.list(500)` |
| `admin/help-desk.tsx` | 2 Supabase reads + 3 mutations → `api.admin.helpDesk.tickets/articles/updateTicket/createArticle/deleteArticle` |
| `admin/analytics.tsx` | 4 parallel Supabase queries (search_history bucket + 3 COUNT queries) → `api.admin.analytics()` |
| `admin/assistant.tsx` | Supabase search_history select → `api.admin.queries.recent(30)` |
| `admin/agents.tsx` | Proxy fetch `/api/admin/agents` + bearer → `api.admin.infra.agents()` |
| `admin/tokens.tsx` | Proxy fetch `/api/admin/tokens` + bearer → `api.admin.infra.tokens()` |
| `admin/infrastructure.tsx` | 2 proxy fetches (mongo/redis) + bearer → `api.admin.infra.mongo()` / `api.admin.infra.redis()` |

---

### §1 (continued) — Server entry

| File | Change |
|------|--------|
| **`src/start.ts`** | Removed `attachSupabaseAuth` from `functionMiddleware`. This middleware injected Supabase session context into every TanStack server function call — no longer needed because auth is handled entirely by the Node backend via httpOnly cookie, with no server-side session injection required on the frontend side. |

---

### §6 — TypeScript errors fixed post-migration

| Error | File | Fix |
|-------|------|-----|
| TS2349 "not callable" | `api-client.ts` | `profiles.update` and `helpDesk.updateTicket` had a parameter named `patch` that shadowed the outer `patch()` HTTP helper. Renamed parameters to `data` and `ticketPatch`. |
| TS2345 argument type | `auth.tsx` | `validateSearch` returned `mode` as `string` instead of `"signup" \| "login"`. Added `as "signup" \| "login"` cast. |
| TS2322 missing redirect | `admin/route.tsx` | TanStack Router requires all validated search fields to be present. Added `redirect: undefined` to the `/auth` redirect search object. |
| TS2339 user_metadata | `onboarding.tsx` | Old code read `user.user_metadata` which existed on Supabase's `User` type but not on the new `AuthUser`. Simplified to `profile?.full_name \|\| ""`. |
| TS2741 missing search (×6) | `app-shell.tsx`, `landing.tsx` (×3), `dataset.$id.tsx` | TanStack Router requires `search` prop when target route has `validateSearch`. Added `search={{ redirect: undefined, mode: "login" }}` for `/auth` links and `search={{ q: "" }}` for `/search` links. |

---

## Architecture Summary

```
Browser
  │
  ├── GET /auth/me  ──────────────────────────────────► Node backend (httpOnly cookie)
  │    (on mount in AuthProvider)                              │
  │                                                            └── MongoDB (profiles)
  │
  ├── EventSource /search/stream?q=  ──────────────────► Node backend
  │    (SSE, withCredentials)                                  │
  │                                                            └── Redis pub/sub + agent pipeline
  │
  └── fetch() with credentials:include  ──────────────► Node backend (all other routes)
       (api-client.ts wrapper)                                 │
                                                               └── MongoDB (all data)
```

**CORS requirement on Node:**
- `Access-Control-Allow-Credentials: true`
- `Access-Control-Allow-Origin: <exact frontend origin>` (not `*`)

---

## Next Steps for Developer

1. **Confirm all `// TODO: confirm Node path` annotations** in `src/lib/api-client.ts` against the actual Node router paths.
2. **Configure Node CORS** per the requirement above before testing in browser.
3. **Supply `VITE_API_BASE_URL`** in `.env` (currently set to `http://localhost:5000` for local dev; update for staging/production).
4. **Test Google OAuth flow**: verify Node's `/auth/google` sets the cookie and redirects back correctly.
5. **Test SSE stream**: verify `GET /search/stream?q=` sends `data: <json>\n\n` frames that the `EventSource.onmessage` handler can parse.

---

## Phase 3 — Help & Docs Page

**Files created:**
- `src/routes/_authenticated/help.tsx` — new authenticated static page with all hardcoded content

**Files modified:**
- `src/components/app/app-shell.tsx` — updated both Help & Docs links (desktop sidebar + mobile menu) from `to="/"` to `to="/help"`, added active-state styling
- `src/routeTree.gen.ts` — registered the new `/help` route under `_authenticated`

**Page sections:**
1. Hero header ("Help & Docs" with subtitle)
2. Introduction card (what NeuroSearch AI is)
3. 4-step "How it works" guide cards
4. Two detailed how-to guides (save data, create collections)
5. 10 FAQ items using shadcn `Accordion`
6. Contact/support card with `mailto:rohit.paliwal@lifelancer.com` link

**Constraints met:**
- Frontend only, no API calls, no backend changes
- Route lives under `_authenticated` — unauthenticated users redirected to `/auth`
- Responsive layout (single column mobile, max-w-4xl desktop)
- Dark/light mode compatible via existing theme tokens
- Semantic headings, keyboard-navigable accordion
