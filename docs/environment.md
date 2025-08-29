# Environment Variables (exsense frontend)

Quickstart:

- Copy env.example to .env.local
- Fill in required values
- Restart dev server after changes

## Variables

- __NEXT_PUBLIC_API_BASE_URL__
  - Purpose: Base URL for API requests
  - Used in: `src/lib/apiclient.ts`
  - Notes: Do not include `/api` suffix; paths like `/api/courses` are appended
  - Example: `http://localhost:3001`

- __NEXT_PUBLIC_VNC_VIEWER_URL__
  - Purpose: noVNC viewer websocket
  - Used in: `src/app/(app)/session/page.tsx`, `src/app/(app)/teacher/page.tsx`
  - Default: `ws://localhost:6901`

- __NEXT_PUBLIC_VNC_WEBSOCKET_URL__
  - Purpose: VNC action/automation websocket
  - Used in: `src/app/(app)/session/page.tsx`, `src/app/(app)/teacher/page.tsx`
  - Default: `ws://localhost:8765`

- __NEXT_PUBLIC_VNC_URL__
  - Purpose: VNC socket used by browser action executor in LiveKit session
  - Used in: `src/hooks/useLiveKitSession.ts`
  - Default: `ws://localhost:6901`

- __NEXT_PUBLIC_SESSION_BUBBLE_URL__
  - Purpose: WebSocket hub for action executor and sensor stream
  - Used in: `src/app/(app)/session/page.tsx`, `src/app/(app)/teacher/page.tsx`
  - Example: `ws://localhost:7001` (set per your infra)

- __NEXT_PUBLIC_WEBRTC_TOKEN_URL__
  - Purpose: Token service base for LiveKit (production-only)
  - Used in: `src/hooks/useLiveKitSession.ts`
  - Dev behavior: In development, code uses `http://localhost:3002` automatically
  - Example: `https://your-token-service`

- __NEXT_PUBLIC_REGISTRATION_API_URL__
  - Purpose: Base for registration API
  - Used in: `src/components/Registrationform.tsx` (appends `/user/fill-details`)
  - Example: `http://localhost:8000`

- __NEXT_PUBLIC_LANGGRAPH_API_URL__
  - Purpose: Base for LangGraph / AI backend
  - Used in: `src/components/Registrationform.tsx` (appends `/user/register`)
  - Example: `http://localhost:8080`

- __NEXT_PUBLIC_IMPRINTER_URL__
  - Purpose: Imprinter / curriculum service base URL
  - Used in: `src/lib/imprinterService.ts`
  - Default: `http://localhost:8002`

- __NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY__
  - Purpose: Clerk frontend key
  - Used by: `@clerk/nextjs`

- __CLERK_SECRET_KEY__
  - Purpose: Clerk server-side secret
  - Used by: middleware/server only

- __NEXT_PUBLIC_CLERK_SIGN_IN_URL__, __NEXT_PUBLIC_CLERK_SIGN_UP_URL__
  - Purpose: Custom routes for auth pages
  - Typical: `/login`, `/register`

- __NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL__, __NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL__
  - Purpose: Optional fallbacks after sign-in/up

## Notes

- Restart `npm run dev` after editing `.env.local`.
- Prefer `.env.local` for developer-specific settings; do not commit secrets.

## Retired / currently unused (confirm before removal)

The following variables exist in `.env` but are not referenced in the current codebase scan. They may be legacy. Search the codebase before removal:

- `NEXT_PUBLIC_RRWEB_WEBSOCKET_URL`
- `NEXT_PUBLIC_VIDEO_VIEWER_URL`
- `NEXT_PUBLIC_AUDIO_URL_HAPPY`
- `NEXT_PUBLIC_AUDIO_URL_SAD`
- `NEXT_PUBLIC_AUDIO_URL_ANGRY`
- `NEXT_PUBLIC_AUDIO_URL_CALM`
- `NEXT_PUBLIC_AUDIO_URL_RIVER`
- `NEXT_PUBLIC_GOOGLE_DOCS_EMBED_URL`
- `NEXT_PUBLIC_API_ENDPOINT_USER_DETAILS`
- `NEXT_PUBLIC_API_ENDPOINT_LANGGRAPH_REGISTER`
