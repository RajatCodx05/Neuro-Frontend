# Build Prompt — Replace Supabase with the Node + MongoDB + Redis Backend

Paste everything below to the coding agent working in this repository (`NeuroSearch_AI` / `Remix_of_NeuroSearch_AI`, TanStack Start).

---

## Context

This project was scaffolded by Lovable, which auto-provisioned a Supabase (Postgres) backend for auth and data. We already have our own backend — **Node.js with its own full auth system, MongoDB, and Redis** (the Redis/SSE live-search pipeline is already built and ready to connect). Supabase is being removed entirely and replaced with direct calls from the browser to our Node backend — **no TanStack server-route proxy layer**; the frontend calls the Node backend's URL directly using `fetch`.

Two known issues in the current build motivate this, for context (do not try to fix these in Supabase — they go away once Supabase is removed):
- Google login goes through `@lovable.dev/cloud-auth-js`, a Lovable-hosted OAuth proxy tied to Lovable's own domains — it cannot work outside Lovable Cloud, including on localhost.
- `_authenticated/route.tsx` and `admin/route.tsx` currently have their auth guards **disabled** ("Demo mode") — re-enabling real guards is part of this migration, against the new Node-backed session check instead of Supabase.

---

## 1. What gets removed

- Dependencies: `@supabase/supabase-js`, `@lovable.dev/cloud-auth-js`
- Files/folders: `src/integrations/supabase/` (client, client.server, auth-attacher, auth-middleware, types), `src/integrations/lovable/`, `supabase/` (migrations + config)
- Env vars: `SUPABASE_PROJECT_ID`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_URL`, `VITE_SUPABASE_PROJECT_ID`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `INTERNAL_API_BASE_URL`, `INTERNAL_API_TOKEN` (this last pair was the old proxy-to-Node-backend pattern used only by the now-removed `repositories.$id.resync.ts`; superseded by `VITE_API_BASE_URL` since calls are direct, see §2)
- **The entire server-side admin proxy layer** — this exists in the codebase and was missed in the first pass of this prompt, so it's easy to miss again:
  - `src/lib/admin-server.ts` — the `requireAdmin()` / `writeAudit()` helpers, both Supabase-dependent (verifies the caller via a Supabase user client, checks `profiles.is_admin` via the service-role client, writes to Supabase's `audit_log` table)
  - `src/routes/api/admin/users.$id.ts` (PATCH/DELETE), `moderation.$id.approve.ts`, `moderation.$id.reject.ts`, `repositories.ts` (POST/DELETE), `repositories.$id.resync.ts`, `infrastructure.mongo.ts`, `infrastructure.redis.ts`, `agents.ts`, `tokens.ts` — every one of these is a TanStack server route that exists solely to safely use the Supabase service-role key server-side. With direct calls to a Node backend that owns its own auth/authorization, this whole proxy layer is unnecessary — delete all of it.
- `src/routes/api/public/delete-account.ts` — same reasoning, delete it too; the frontend calls the Node backend's own delete-account endpoint directly instead.

## 2. What gets added

**Env vars** (new): `VITE_API_BASE_URL` — the Node backend's base URL (e.g. `http://localhost:PORT` in dev, production URL in prod). Since calls are direct from the browser, this must be reachable from the client, not just server-side.

**New file: `src/lib/api-client.ts`** — the single fetch wrapper everything below routes through. Responsibilities:
- Reads `VITE_API_BASE_URL`, builds full request URLs
- Attaches the stored auth token as `Authorization: Bearer <token>` on every request (read from wherever the new auth system stores it — see §3)
- Centralizes JSON parsing + error handling (throw on non-2xx with the backend's error message, matching the `toast.error(...)` pattern already used throughout the app)
- Exposes small typed helpers per resource (e.g. `api.savedDatasets.list()`, `api.profiles.update(patch)`) rather than the app calling raw `fetch` everywhere — mirrors how `supabase.from(...)` reads today, so call sites stay just as concise after migration

**Backend requirement — CORS**: the Node backend must allow the frontend's origin(s) (including local dev port) with `Authorization` header support. Since this is bearer-token-in-header (not cookies), `credentials: include` / cookie CORS config is not required — simpler CORS setup than a cookie-based approach.

---

## 3. Auth system replacement

**`src/lib/auth-context.tsx`** — keep the exact same exported shape (`user`, `session`, `profile`, `loading`, `refreshProfile`, `signOut`) so every consumer (`AppShell`, `AdminShell`, route guards, etc.) needs zero changes. Internally, replace:
- `supabase.auth.onAuthStateChange` / `supabase.auth.getSession()` → call the Node backend's "get current session/user" endpoint on mount, store the result in state
- Token storage → keep using `localStorage` (matches current `persistSession: true` behavior) unless the Node backend's existing auth system already dictates a different mechanism (e.g. httpOnly cookie) — confirm which one the Node backend actually uses and match it; don't assume
- `loadProfile()` (`supabase.from("profiles").select("*").eq("id", userId)`) → Node backend's "get profile by id" / "get my profile" endpoint
- `signOut()` (`supabase.auth.signOut()`) → Node backend's logout endpoint, then clear local token

**`src/routes/auth.tsx`** — replace three calls:
- `handleLogin`: `supabase.auth.signInWithPassword(...)` → Node backend login endpoint
- `handleSignup`: `supabase.auth.signUp(...)` → Node backend signup endpoint (keep sending `full_name`, `phone`, and an `email_signup` flag equivalent if the Node backend also distinguishes email-signup-complete vs. needs-onboarding, matching current `onboarding_complete` logic)
- `handleGoogle`: replace the entire `lovable.auth.signInWithOAuth(...)` call with the Node backend's real Google OAuth flow (whatever it already implements — likely a redirect to a Node-hosted `/auth/google` endpoint rather than an in-page token exchange). Update this function's shape to match however the Node backend's OAuth flow actually returns control to the app.

**Route guards** — re-enable both, replacing the disabled "Demo mode" state:
- `src/routes/_authenticated/route.tsx`: `beforeLoad` validates the session via the Node backend (e.g. verify the stored token / call "get current user"); redirect to `/auth` on failure, matching the removed Supabase-based logic that used to be here
- `src/routes/admin/route.tsx`: same, plus checking the equivalent of `profiles.is_admin` from the Node-backed profile; redirect to `/` (not `/auth`) if authenticated but not an admin

---

## 4. Exhaustive call-site migration map

Every `supabase.*` usage in the app today, grouped by file, with what it needs to become. Preserve existing filters/ordering/limits/counts exactly — this is a backend swap, not a behavior change.

### `src/routes/search.tsx`
- `supabase.from("search_history").insert({ user_id, query })` → Node: create search-history entry
- `supabase.from("saved_datasets").upsert({...})` → Node: save/upsert a dataset for the current user

### `src/routes/dataset.$id.tsx`
- `supabase.from("saved_datasets").upsert({...})` → same as above

### `src/routes/_authenticated/history.tsx`
- `select("*").eq("user_id", user.id)` → Node: list search history for current user
- `delete().eq("user_id", user.id)` → Node: clear all search history for current user
- `delete().eq("id", id)` → Node: delete one search-history entry by id

### `src/routes/_authenticated/settings.tsx`
- `social_links select().eq("user_id", user.id)` → Node: list social links for current user
- `profiles.update({...})` (profile fields) → Node: update current user's profile
- `profiles.update({ notifications_enabled })` → Node: update notification preference
- `social_links.insert(...)` (add link) → Node: create social link
- `social_links.delete().eq("id", id)` → Node: delete social link
- The `Authorization: Bearer ${session.access_token}` line calling a fetch (likely the delete-account flow) → point directly at the Node backend's delete-account endpoint, using the token from the new auth system

### `src/routes/_authenticated/onboarding.tsx`
- `profiles.update({...})` → Node: complete onboarding (role, phone, institute, `onboarding_complete: true`)

### `src/routes/_authenticated/saved.tsx`
- `saved_datasets select().eq("user_id", user.id).order(...)` and `collections select().eq("user_id", user.id).order(...)` (parallel) → Node: list saved datasets + list collections for current user
- `saved_datasets.delete().eq("id", id)` → Node: remove a saved dataset
- `collections.insert(...)` → Node: create collection
- `collections.delete().eq("id", id)` → Node: delete collection

### Admin pages (`src/routes/admin/*`) — two different patterns to migrate

**Reads** — these pages call Supabase directly from the client with a bearer token (list queries only, no mutation):
- `admin/index.tsx`: counts for `profiles`, pending `dataset_moderation_queue`, `repositories` list, recent `audit_log` → Node: admin dashboard summary endpoint(s)
- `admin/users.tsx`: `profiles` list with specific columns incl. `is_admin`, `suspended` → Node: admin list-users endpoint
- `admin/repositories.tsx`: `repositories` list → Node: admin list-repositories endpoint
- `admin/moderation.tsx`: pending `dataset_moderation_queue` + recent `saved_datasets` → Node: admin moderation-queue + recent-datasets endpoints
- `admin/assistant.tsx`: recent `search_history` → Node: admin recent-queries endpoint
- `admin/announcements.tsx` (list part): `announcements` list → Node: matching list endpoint
- `admin/audit-log.tsx`: list `audit_log` → Node: admin audit-log endpoint
- `admin/help-desk.tsx` (list parts): `support_tickets` + `help_articles` lists → Node: matching list endpoints
- `admin/analytics.tsx`: `search_history` (for trend), counts on `profiles`/`saved_datasets`/`collections` → Node: admin analytics endpoint(s)

**Mutations** — these pages currently call the now-removed `/api/admin/*` TanStack server routes (which proxied to Supabase's service-role client). Point them directly at the equivalent Node backend endpoint instead, carrying the same bearer token as everything else:
- `PATCH /api/admin/users/$id` (suspend/unsuspend, grant/revoke `is_admin`, edit role/institute/name) and `DELETE /api/admin/users/$id` (permanently delete a user + their auth account) → Node: user update / user delete endpoints
- `POST /api/admin/moderation/$id/approve` (publishes the community-discovered dataset into the live catalog, marks queue row `approved`) and `POST /api/admin/moderation/$id/reject` (marks `rejected` with a reason) → Node: moderation approve / reject endpoints, same publish-on-approve behavior
- `POST /api/admin/repositories` (create) and `DELETE /api/admin/repositories?id=` (delete) → Node: repository create / delete endpoints
- `POST /api/admin/repositories/$id/resync` → Node: repository resync endpoint (this one used to optionally proxy to `INTERNAL_API_BASE_URL` and fall back to a local status flip — now that Node *is* the primary backend, this is just a normal direct call, no fallback branching needed)
- `GET /api/admin/infrastructure/mongo`, `/redis`, `GET /api/admin/agents`, `GET /api/admin/tokens` → these already just called `admin-infra-api.ts`'s mock/real functions; point `admin-infra-api.ts` itself at the real Node endpoints (§ below) and have these pages call it directly, or call the Node backend directly and remove `admin-infra-api.ts`'s indirection entirely — either works, but don't keep both layers
- Announcements insert/update(active)/delete, help-desk ticket status update, help-article insert/delete → same pattern: Node CRUD endpoints, direct calls

**Audit logging** — `writeAudit()` in the old `admin-server.ts` wrote an `audit_log` row to Supabase after every mutation above. This responsibility moves to the **Node backend itself**: when Node receives an authenticated admin mutation request, it should write its own audit-log entry server-side. The frontend does not need to make a second call to log the action — that was only necessary because the old code ran the audit-write itself, TanStack-server-side.

**Admin-check ownership** — `requireAdmin()` checked `profiles.is_admin` via Supabase on every admin API call. Confirm the Node backend's existing auth system has an equivalent admin/role concept it can check server-side; if it doesn't yet, that's a small addition needed on the Node side before this migration can fully replace the admin guard, not just a frontend change.

---

## 5. Search + SSE/Redis pipeline

Since the Redis pub/sub + SSE pipeline is already built on the Node side: wire `src/routes/search.tsx`'s data-fetching to open an SSE connection (or call the appropriate endpoint) directly against `VITE_API_BASE_URL`, replacing whatever static/mock search data currently powers results. Results arriving over SSE should render incrementally as they're published, matching the actual Node/Redis/agent flow (Fallback Agent → Search Provider Agent → Link Verifier Agent) rather than waiting for one batch response.

---

## 6. Deliverable checklist

- [ ] All Supabase/Lovable-auth dependencies, files, and env vars removed (§1), including the full `src/routes/api/admin/*` proxy layer and `src/lib/admin-server.ts`
- [ ] `src/lib/api-client.ts` created — single fetch wrapper, bearer-token auth, typed resource helpers
- [ ] `VITE_API_BASE_URL` added to `.env`; CORS confirmed working against the Node backend for the local dev origin
- [ ] `auth-context.tsx` re-implemented against Node auth, same exported shape, no consumer changes required
- [ ] `auth.tsx` login/signup/Google flows all call the Node backend
- [ ] `_authenticated/route.tsx` and `admin/route.tsx` guards re-enabled against Node-backed session/admin checks (demo mode removed)
- [ ] Confirmed the Node backend's auth system has an admin/role concept it can check server-side (needed to replace `requireAdmin()`)
- [ ] Every call site in §4 migrated with identical filtering/ordering/limit behavior, including all former `/api/admin/*` mutation endpoints now called directly on Node
- [ ] Audit logging confirmed to happen server-side in Node on each admin mutation (not re-implemented in the frontend)
- [ ] `admin-infra-api.ts` pointed at real endpoints (or removed in favor of calling Node directly — pick one, don't keep both layers)
- [ ] `/search` wired to the live SSE/Redis pipeline
- [ ] `src/routes/api/public/delete-account.ts` removed; delete-account calls the Node backend directly