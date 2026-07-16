
This is a big scope — auth + database-backed features. I'll enable **Lovable Cloud** to power login, profiles, saved datasets, collections, history, and settings. The existing dark neuro visual style stays exactly as-is; nothing gets restyled.

## 1. Landing page shell (visual style unchanged)

- Add a **persistent left sidebar** on the landing page with:
  - Platform logo (top of sidebar) → clicks back to `/`
  - **Dashboard** → landing/home
  - **Saved Datasets & Collections**
  - **History** (recent searches)
  - **Settings**
- Add a **top bar** on the landing page:
  - Existing logo top-left
  - Top-right: **notification bell** icon + **profile button** (avatar dropdown → Settings, Sign out)
- Sidebar collapses to icons on mobile; content area keeps current hero/search UI untouched.

## 2. Auth gate on the search bar

- If the user is **not signed in** and clicks the search bar / submits a search → redirect to `/auth` (login).
- Login page has a **"Sign up" link** that swaps to the signup form (same route, two tabs).
- **Login form:** email + password, plus **Continue with Google**.
- **Signup form:** full name, email, phone, password, confirm password, signup button, plus **Continue with Google**.
- After email signup or login → go to `/` (or the search they attempted).
- After Google login for a **new** user → go to `/onboarding`.

## 3. Onboarding (Google-only, first-time)

Route `/onboarding`, only reachable when a Google-authenticated user hasn't completed profile:
- Fields: name (prefilled from Google), phone number, role (dropdown: Student / Researcher / Clinician / Other), institute name.
- If role = Student, institute name is required.
- Submit → mark profile complete → redirect to `/`.

## 4. Saved Datasets & Collections

- **Saved datasets:** click a bookmark icon on any dataset card/detail → saved to the user's account.
- **Collections:** user can create named folders (e.g. "ADHD studies"), add saved datasets to them, remove them, delete a collection.
- Page shows two tabs: "All saved" and "Collections".

## 5. History

- Every search query the signed-in user runs is logged.
- History page lists recent searches (most recent first), clickable to re-run.
- "Clear history" button.

## 6. Settings

Sections:
- **Profile:** name (editable), email (read-only), phone, institute name, role.
- **Notifications:** on/off toggle.
- **Social links:** add/remove LinkedIn, GitHub, Pinterest, Instagram URLs.
- **Danger zone:** Delete Account (confirm modal → deletes auth user + all their rows).

## Technical notes

- Enable **Lovable Cloud** (Supabase under the hood) for auth + Postgres.
- Enable **Google sign-in** via the managed configurator; email/password enabled by default.
- Tables (all with RLS scoped to `auth.uid()`):
  - `profiles` (id, full_name, phone, role, institute, notifications_enabled, onboarding_complete, created_at) — auto-created via trigger on signup
  - `social_links` (id, user_id, platform, url)
  - `saved_datasets` (id, user_id, dataset_id, dataset_snapshot jsonb, created_at)
  - `collections` (id, user_id, name, created_at)
  - `collection_items` (collection_id, saved_dataset_id)
  - `search_history` (id, user_id, query, created_at)
- Public routes: `/`, `/auth`, `/search`, `/dataset/$id`.
- Protected routes under `src/routes/_authenticated/`: `/saved`, `/history`, `/settings`, `/onboarding`.
- The sidebar renders on every page but its links to protected routes still work — clicking one when signed-out redirects to `/auth`.
- Search input on `/` gets an `onFocus`/`onSubmit` guard: if no session → `navigate('/auth')`.
- Delete Account → server function using admin client to delete the auth user (cascades all rows via FK).

## What I'll NOT change

- Existing color palette, gradients, fonts, hero visuals, dataset detail page styling — all preserved.
- The sidebar and auth pages will use the same dark glass/neural aesthetic already in `styles.css`.

Ready to build this end-to-end. Shall I proceed?
