# Development Guide

## Scripts
- `npm run dev` – start Next.js
- `npm run build` – production build
- `npm run lint` – lint
- `npm run generate-protos` – regenerate any protobuf outputs (if configured)

## Adding a new API surface (frontend)
1) Add a typed method in `src/lib/api.ts`
2) Add a hook or mutation in `src/hooks/useApi.ts`
3) Use the hook in your component; invalidate relevant `queryKeys`
4) Add UI and toasts; keep logic in hooks/services, not components

## Adding a new page/route
- Create a directory under `src/app/.../page.tsx`
- Use client components when interacting with hooks/state
- Co-locate small UI components or place shared ones in `src/components/`

## Testing flows
- Manual: run backend + frontend; sign in via Clerk; confirm guarded endpoints
- Automated: e2e or unit tests exist on the backend for guards and courses controller

## Docs
- Update `docs/environment.md` when adding env vars
- Update `docs/auth-roles.md` when changing role logic or guards
