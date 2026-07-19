Mission
I have two repos in this workspace:

Neuro-Backend-main/ — Express 5 + MongoDB + Redis + SSE + JWT (already fully implemented — DO NOT MODIFY)
Neuro-Frontend-master/ — TanStack Start + React 19 + Vite + Tailwind (frontend has an api-client.ts scaffold but several routes still call methods that don't exist / have TODO: confirm Node path comments and mock fallbacks)
Your job: Complete the frontend↔backend wiring so every page uses real backend data, then push both repos to GitHub and deploy both on Vercel.

HARD RULES — Read Twice Before Touching Anything

DO NOT modify the backend. No changes to any file under Neuro-Backend-main/. If a route is missing on the backend, remove/disable the corresponding frontend feature instead — never invent a backend route.
DO NOT change any layout, JSX structure, className strings, Tailwind styles, colors, gradients, glass / glass-strong / card-elevated / hero-bg classes, framer-motion animations, neural-background, AppShell, AdminShell, Landing, site-nav, site-footer, or any file under src/components/ui/, src/components/site/, or src/components/app/.
Only touch: src/lib/api-client.ts, src/lib/auth-context.tsx (only if strictly needed), src/routes/** (only the logic inside components — hooks, handlers, data fetching — never the returned JSX styling), and add environment / config files (.env.example, vercel.json, README.md).
No mock data. Delete usage of src/lib/mock-data.ts from live pages (keep the file, but stop importing it in production paths).
Preserve TypeScript strictness. No any unless already present; keep existing Record<string, unknown> patterns.
Preserve the response envelope contract — backend wraps everything in { success, message, data }. The existing request<T>() helper in api-client.ts already unwraps this — reuse it.

 Canonical Backend Route Map (source of truth — from src/routes/index.js and each module's routes file)
Base URL: /api/v1

Auth (/auth)
Method	Path	Body	Notes
POST	/auth/register	{ name, email, password, confirmPassword, countryCode, phone }	Sends email OTP
POST	/auth/login	{ email, password }	Rate-limited
POST	/auth/refresh	—	Uses httpOnly refresh cookie
POST	/auth/logout	—	
POST	/auth/verify-otp	{ email, otp }	Post-signup
POST	/auth/resend-otp	{ email }	
POST	/auth/forgot-password	{ email }	
POST	/auth/reset-password	{ email, otp, newPassword }	
POST	/auth/google	{ idToken }	Google Sign-In
POST	/auth/complete-onboarding	{ name, role, institute, countryCode, phone }	Requires auth
GET	/auth/me	—	Requires auth
User (/users) — all require auth
Method	Path	Notes
GET	/users/me	Reachable pre-onboarding
PUT	/users/me	Requires onboarding complete
PATCH	/users/me/notifications	{ enabled }
DELETE	/users/me	Cascade delete
POST/GET/DELETE	/users/saved-datasets[/:id]	
POST/GET/DELETE	/users/collections[/:id] + /:id/items[/:savedDatasetId]	
GET/DELETE (all) / DELETE /:id	/users/search-history	
PUT/GET/DELETE /:id	/users/social-links	
Admin (/admin) — requires admin role
Method	Path	Notes
POST	/admin/login	Password → sends 2FA OTP
POST	/admin/verify-login-otp	{ email, otp } → tokens
GET / DELETE /:id	/admin/users	
GET / DELETE /:datasetId	/admin/datasets	
GET / POST / DELETE /:id / POST /:id/resync	/admin/repositories	
GET	/admin/analytics	Returns { series, users, saved, collections, cacheHitRate }
GET	/admin/dashboard	Returns { totalUsers, repositories, recentAudit }
GET	/admin/audit-log?limit=	Default 100, max 500
Dataset (/datasets) — requires auth + onboarding
Method	Path	Notes
POST	/datasets/search	{ query } → { source: "cache"|"agent", results?, queryId? }
Query Log (/query-logs)
| GET | /query-logs/me | Requires auth |

Realtime (/stream)
| GET (SSE) | /stream/:queryId | Frontend opens after receiving queryId from /datasets/search. 90 s timeout. Emits { status, datasets|results }. |

⚠️ Routes that DO NOT exist on the backend (remove from frontend or hide UI):

PATCH /admin/users/:id (used by admin/users.tsx for toggleAdmin / toggleSuspend) → only DELETE exists. Remove the suspend/promote handlers and their buttons' onClick (keep the button visuals disabled or wire only delete).
api.admin.moderation.* (queue/published/approve/reject) — no moderation routes exist. Either hide the moderation tab content behind an "unavailable" state, or stub the query to return [] so the empty-state renders (no visual change).
api.admin.infra.tokens() — no /admin/tokens route exists. Same handling: return [] from the query so the page renders its empty state.
Any admin route like announcements, agents, help-desk, assistant, infrastructure — leave the page shells as-is; wire only dashboard, analytics, users, repositories, audit-log.

Task Breakdown
Task 1 — Fix / complete src/lib/api-client.ts
The file already covers most calls. Make these targeted edits without changing existing working helpers:

Confirm BASE_URL logic keeps working with the Vite proxy in dev (/api/v1) and VITE_API_BASE_URL in prod. Change the hardcoded fallback "https://neuro-server.vercel.app/api/v1" to only use import.meta.env.VITE_API_BASE_URL and throw a clear console warning if it's missing in prod.
Add missing methods that pages already call:
api.savedDatasets.list() currently maps datasetSnapshot via mapDataset — keep that.
Add api.searchHistory.list() typing so it returns { id, query, created_at }[].
api.admin.users.update(id, patch) — DELETE this method call site, not the backend. Remove toggleSuspend / toggleAdmin handlers in admin/users.tsx and drop the two icon buttons' onClicks (leave the icons purely visual, or remove only the click handlers — do not change layout).
api.admin.moderation.* — stub as functions that resolve to [] / no-op, OR remove the queries in admin/moderation.tsx and short-circuit the component to render the existing "Nothing to review right now." empty state (no JSX changes).
api.admin.infra.tokens() — stub to Promise.resolve([]).
Add api.admin.auth.login(email, password) + verifyLoginOtp(email, otp) for the admin login flow (POST /admin/login, POST /admin/verify-login-otp) — currently missing.
Add api.auth.forgotPassword(email) and api.auth.resetPassword(email, otp, newPassword) (endpoints exist, client doesn't expose them yet).
Fix admin dashboard/analytics response mapping — backend returns repositories with fields name, sync_status, dataset_count, last_sync_at, trust_tier, endpoint_config, createdAt. The dashboard page already reads these; make sure mapProfile-style helpers don't accidentally strip them.
api.datasets.search already returns { source, results, queryId } — keep unchanged; just ensure it also POSTs the query to /users/search-history implicitly via backend (backend already logs — no client call needed). If not logged automatically, DO NOT add a client-side POST — history writes happen backend-side inside dataset.controller.js.
Task 2 — Fix src/routes/search.tsx
There's a broken second useEffect block (lines ~95–121): after the SSE handler already returned, there's dead code that references an undefined es variable. Delete the dead block only — from the comment // Log search to history if user is signed in ... through the second return () => { es.close(); ... }. Keep everything above (the working async IIFE with esRef) intact. Verify TypeScript compiles.

Task 3 — Wire remaining routes
Go through every file under src/routes/** and:

Replace any import ... from "@/lib/mock-data" in live pages with real api.* calls (Landing page can keep mock stats since it's marketing content — verify with the user, but default to keeping Landing untouched since it's presentational).
Every page that has // TODO: confirm Node path — either confirm the path matches the table above (remove the TODO) or, if the route doesn't exist, apply the stub pattern from Task 1.
Every useQuery / useEffect fetch: add proper error toasts with sonner (pattern already used in search.tsx, saved.tsx).
Task 4 — Environment files
Create:

Neuro-Frontend-master/.env.example

CopyVITE_API_BASE_URL=https://<your-backend>.vercel.app/api/v1
VITE_GOOGLE_CLIENT_ID=
Neuro-Backend-main/.env.example — already exists; do not touch.

Create a Neuro-Frontend-master/.env.local with a dev placeholder for local runs (leave empty; the Vite proxy handles dev).

Task 5 — Vercel deployment configs
Neuro-Backend-main/vercel.json (Express on Vercel serverless):

Copy{
  "version": 2,
  "builds": [{ "src": "src/server.js", "use": "@vercel/node" }],
  "routes": [{ "src": "/(.*)", "dest": "src/server.js" }]
}
Also add a small wrapper if needed so app.listen is skipped on Vercel: create api/index.js at repo root that does module.exports = require('../src/app'); and point vercel.json to api/index.js instead. This is the only backend "change" allowed — a Vercel entry file, no logic changes.

Actually — re-reading the hard rules: instead of adding files inside Neuro-Backend-main/src/, create only Neuro-Backend-main/api/index.js and Neuro-Backend-main/vercel.json at the repo root. That keeps src/ untouched.

Neuro-Frontend-master/vercel.json:

Copy{
  "buildCommand": "npm run build",
  "framework": null,
  "outputDirectory": ".output/public"
}
(TanStack Start / Nitro outputs to .output. Verify with npm run build locally — if the framework preset is auto-detected on Vercel, delete this file.)

Task 6 — CORS reality check (informational only, do NOT edit backend)
Backend reads FRONTEND_ORIGIN from env. When deploying, we will set FRONTEND_ORIGIN=https://<vercel-frontend>.vercel.app in the backend's Vercel env vars. Refresh cookies are httpOnly + SameSite — for cross-site cookies to work in prod, the backend already sets credentials: true and the frontend already uses credentials: "include". Both hosts must be HTTPS.

Task 7 — README + run instructions
Create/overwrite Neuro-Frontend-master/README.md with:

Prerequisites (Node 20+, backend running or VITE_API_BASE_URL set)
npm install, npm run dev (uses Vite proxy → localhost:5000)
npm run build
Environment variables list
Deploy notes (Vercel: set VITE_API_BASE_URL, VITE_GOOGLE_CLIENT_ID)
Do the same for the backend README, listing all env vars from .env.example.

Task 8 — GitHub push
For each repo separately:

Copycd Neuro-Backend-main
git init && git add . && git commit -m "chore: initial commit with vercel config"
git branch -M main
git remote add origin <backend-repo-url>
git push -u origin main

cd ../Neuro-Frontend-master
git init && git add . && git commit -m "feat: wire backend routes, vercel-ready"
git branch -M main
git remote add origin <frontend-repo-url>
git push -u origin main
Ask me for the two GitHub repo URLs before executing. Verify .gitignore covers node_modules, .env, .env.local, .output, dist, .vercel.

Task 9 — Vercel deploy
Deploy the backend first (need its URL to configure the frontend).

In Vercel dashboard for backend, add every env var from .env.example: MONGO_URI, MONGO_DB_NAME, REDIS_URL, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, JWT_ACCESS_EXPIRES_IN, JWT_REFRESH_EXPIRES_IN, FRONTEND_ORIGIN (fill after frontend deploys — expect a two-pass deploy), PYTHON_AGENT_BASE_URL, PYTHON_AGENT_INTERNAL_SECRET, SMTP_USER, SMTP_PASS, OTP_EXPIRY_MINUTES, ADMIN_OTP_EXPIRY_MINUTES, PASSWORD_RESET_OTP_EXPIRY_MINUTES, NODE_ENV=production.

Deploy frontend with VITE_API_BASE_URL=https://<backend>.vercel.app/api/v1 and VITE_GOOGLE_CLIENT_ID set.

Go back and set FRONTEND_ORIGIN on the backend to the frontend URL, then redeploy backend.

⚠️ Serverless caveats to warn me about before deploying — do not silently proceed:

SSE (/stream/:queryId) requires a long-lived connection; Vercel serverless functions time out (default 10 s, 60 s max on Pro). Suggest deploying the backend on Render / Railway / Fly instead if SSE is critical, OR splitting the SSE route to a separate always-on service.
Redis pub/sub subscriber (startRedisSubscriber()) also needs a persistent process — same concern.
Mongoose connection pooling — the current connectDB() at boot works, but on serverless each cold start reconnects; that's acceptable but slower.
Stop and confirm with me whether to proceed with Vercel-for-backend anyway, or to swap the backend host.

🧪 Verification Checklist (run before pushing)
 cd Neuro-Frontend-master && npm install && npm run build → no TS errors
 cd Neuro-Backend-main && npm install && npm start → server boots (needs local Mongo + Redis or valid env vars)
 Frontend dev server: npm run dev on :8080 proxies /api/v1 → backend on :5000
 Manual smoke tests:
Register → OTP → verify → onboarding → landing
Login → search "fMRI ADHD" → results (either cache or SSE stream) render
Save a dataset → appears on /saved
Create a collection → appears on /saved collections tab
Search shows up in /history
Settings: update profile, toggle notifications, add social link, delete account
Admin login → 2FA OTP → dashboard, analytics, users list, repositories CRUD, audit log
 Grep confirm: git grep "TODO: confirm Node path" src/ returns zero results
 Grep confirm: git grep "from \"@/lib/mock-data\"" src/routes/ returns only marketing/landing pages, if any
📦 Deliverables
Two commits (one per repo) on main with the wiring changes and configs
Two Vercel URLs (backend + frontend) after successful deploy
A short summary of any routes stubbed/hidden (moderation, tokens, admin user patch)
Any warnings about serverless SSE / Redis limitations
▶️ Kickoff
Start by (1) running npm install in both repos, (2) opening src/lib/api-client.ts and src/routes/search.tsx to make the two critical fixes (Task 1 + Task 2), (3) doing a full build to surface TypeScript errors, (4) fixing each error against the route map above. Then ask me for the two GitHub repo URLs and my Vercel account/team before pushing and deploying.

Do not deviate from the layout/styling rules. When in doubt, ask before editing.