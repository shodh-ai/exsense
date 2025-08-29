# Exsense Architecture

- __Framework__: Next.js App Router (React 19)
- __Auth__: Clerk
- __Data fetching__: Fetch + lightweight API client with Clerk Bearer token
- __State__: React Query + Zustand (session UI state)
- __Realtime__: LiveKit for AV + RPC; VNC for browser automation view

## High-level flow
1. __Auth__ via Clerk on the frontend.
2. __API calls__ use `src/lib/apiclient.ts` which reads `NEXT_PUBLIC_API_BASE_URL` and attaches `Authorization: Bearer <Clerk token>` when available.
3. __Backend__ (NestJS service: one-backend) exposes REST under `/api/*` and `/health`.
4. __LiveKit__ token is fetched from a separate token service (`/api/generate-room`) at `NEXT_PUBLIC_WEBRTC_TOKEN_URL` (dev default `http://localhost:3002`).
5. __VNC__ websocket URL for agent-driven browser actions is `NEXT_PUBLIC_VNC_URL`.

## Key modules
- __API service__: `src/lib/api.ts`
  - Wraps `createApiClient()` and provides typed methods (courses, lessons, enrollments, admin, reports, health).
- __API client__: `src/lib/apiclient.ts`
  - Builds `fetch()` requests to `${NEXT_PUBLIC_API_BASE_URL}<path>` with JSON headers and optional `Authorization` from Clerk.
- __React Query__: `src/components/QueryProvider.tsx`, wired in `src/app/(app)/layout.tsx`.
- __LiveKit hook__: `src/hooks/useLiveKitSession.ts`
  - Fetches token from token service, connects to LiveKit, bridges RPCs to UI and VNC actions.
- __Auth pages & routes__: `src/app/(app)/(login)/*`, `src/app/api/promote-role/route.ts` (updates Clerk user public metadata: role).

## Directory basics
- `src/app/` — Next.js routes (App Router)
- `src/components/` — UI components
- `src/hooks/` — client hooks (e.g., LiveKit)
- `src/lib/` — api client, stores, utils
- `src/generated/` — protobuf output (via `npm run generate-protos`)
- `protos/` — proto source files

## Services overview
- __Backend API (NestJS)__: receives authenticated requests under `/api/*` from the browser.
- __Token Service__ (LiveKit): POST `/api/generate-room` with Bearer Clerk token + `{ curriculum_id }` to return `{ studentToken, livekitUrl, roomName }`.
- __LiveKit Server__: websocket endpoint used by the token response.
- __VNC Server__: websocket (`ws://...`) used by the browser automation tools.
