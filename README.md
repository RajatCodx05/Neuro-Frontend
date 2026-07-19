# NeuroSearch AI — Frontend

Semantic search engine for open neuroscience datasets built with [TanStack Start](https://tanstack.com/start/latest) (React 19, Vite, Nitro).

## Prerequisites

- Node.js 20+
- Backend running locally (default `localhost:5000`) or set `VITE_API_BASE_URL`

## Setup

```bash
npm install
npm run dev        # starts on :8080, proxies /api/v1 -> localhost:5000
npm run build      # production build
```

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `VITE_API_BASE_URL` | Yes (production) | `/api/v1` (dev proxy) | Backend API base URL |
| `VITE_GOOGLE_CLIENT_ID` | No | — | Google Sign-In OAuth client ID |

Copy `.env.example` to `.env.local` and fill in the values.

## Project Structure

```
src/
  lib/
    api-client.ts     # All backend API calls
    auth-context.tsx  # Auth provider & hooks
    mock-data.ts      # Static mock data (marketing pages only)
  routes/             # TanStack Start file-based routes
  components/
    app/              # App & Admin shells
    site/             # Landing page components
    ui/               # shadcn/ui primitives
```

## Key Architecture Decisions

- **Auth**: httpOnly refresh cookie + Bearer access token stored in `sessionStorage`. The `request<T>()` helper auto-refreshes on 401.
- **API envelope**: Backend wraps everything in `{ success, message, data }`. `request<T>()` unwraps and returns `data: T`.
- **SSE streaming**: Search results stream via `EventSource` after an initial `/datasets/search` POST returns a `queryId`.
- **Styling**: Tailwind CSS with dark-first custom properties. No CSS-in-JS.

## Deployment (Vercel)

1. Set `VITE_API_BASE_URL` to your deployed backend URL (e.g. `https://neuro-api.vercel.app/api/v1`)
2. Set `VITE_GOOGLE_CLIENT_ID` if using Google Sign-In
3. Deploy: `npx vercel --prod`

The Nitro server preset is auto-detected by Vercel; the output goes to `.output/public`.
