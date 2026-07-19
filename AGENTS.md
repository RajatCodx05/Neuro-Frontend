<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

# Implementation Log — Frontend ↔ Backend Wiring

## Completed Tasks (Tasks 1–7, skipping 8 & 9)

### Task 1 — `src/lib/api-client.ts`
- **BASE_URL**: Replaced hardcoded `"https://neuro-server.vercel.app/api/v1"` fallback with `import.meta.env.VITE_API_BASE_URL` only; added `console.warn` when unset in production.
- **Missing auth methods**: Added `api.auth.forgotPassword(email)` and `api.auth.resetPassword(email, otp, newPassword)` matching the backend routes.
- **Admin auth**: Added `api.admin.auth.login(email, password)` and `api.admin.auth.verifyLoginOtp(email, otp)` for the 2FA admin login flow.
- **Admin stubs** (routes that don't exist on the backend):
  - `api.admin.moderation.*` — resolves to `[]` / `null`
  - `api.admin.infra.mongo()` / `redis()` / `tokens()` / `agents()` — resolves to `[]` / `null`
  - `api.admin.announcements.*` — resolves to `[]` / `null`
  - `api.admin.helpDesk.*` — resolves to `[]` / `null`
  - `api.admin.queries.recent()` — resolves to `[]`
- **Removed**: `api.admin.users.update()` — backend only supports `DELETE /admin/users/:id`.

### Task 2 — `src/routes/search.tsx`
- Deleted the dead second `useEffect` block (lines that referenced an undefined `es` variable with duplicate SSE handling and TODO comments).

### Task 3 — Route wiring
- **`admin/users.tsx`**: Removed `toggleSuspend`/`toggleAdmin` handlers (backend has no PATCH). Converted shield/ban icon buttons to static visual indicators with `cursor-default`.
- **`admin/index.tsx`**: Removed `pendingModeration` reference (not returned by backend). Replaced with "Recent audits" stat using `recentAudit.length`.
- **`dataset.$id.tsx`**: Replaced `@/lib/mock-data` import with real `api.datasets.search()` call. Changed from synchronous `loader` to async `useEffect` fetch. Added loading and not-found states.
- **All route files**: Removed every `// TODO: confirm Node path` comment.
- **Admin announcements/agents/assistant/help-desk/infrastructure/tokens pages**: All stub API calls now resolve to `[]` or `null`, so pages render their empty states without errors.

### Task 4 — Environment files
- Created `.env.example` with `VITE_API_BASE_URL` and `VITE_GOOGLE_CLIENT_ID`.
- Created `.env.local` placeholder for local development.

### Task 5 — Vercel deployment config
- Created `vercel.json` with `buildCommand`, `framework: null`, and `outputDirectory: ".output/public"`.

### Task 6 — CORS (informational, no change)
- Backend reads `FRONTEND_ORIGIN` from env. Refresh cookies are `httpOnly` + `SameSite`. Both hosts must be HTTPS.

### Task 7 — README
- Created `README.md` with prerequisites, setup, environment variables, project structure, architecture decisions, and deployment notes.

## Routes Stubbed/Hidden (no backend support)
- Moderation queue/published/approve/reject
- Token usage tracking
- Infrastructure (MongoDB/Redis) metrics
- Announcements CRUD
- Help desk tickets/articles
- Agent activity logs
- AI assistant query oversight
- Admin user PATCH (suspend/promote)

## Warnings for Deployment
- **SSE** (`/stream/:queryId`) requires long-lived connections — Vercel serverless functions time out (default 10s, 60s max on Pro). Consider deploying the backend on Render/Railway/Fly if SSE is critical.
- **Redis pub/sub** (`startRedisSubscriber()`) also needs a persistent process.
- **Mongoose** reconnects on every cold start on serverless.
