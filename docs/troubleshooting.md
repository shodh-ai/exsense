# Troubleshooting

## 401/403 from API
- You are not signed in or the Clerk token is missing.
- Ensure Clerk keys are set in `.env.local` and you are logged in.
- Verify your role has access to the endpoint (see `docs/auth-roles.md`).

## CORS or network errors
- Check `NEXT_PUBLIC_API_BASE_URL` matches the backend origin (no `/api` suffix).
- Backend should expose `/api/*` and `/health` routes.

## Backend not reachable / health fails
- Open `${NEXT_PUBLIC_API_BASE_URL}/health`.
- If running locally, start the NestJS backend and ensure the database is up.

## Database connection errors (backend)
- Set `DATABASE_URL` to a reachable Postgres. Cloud SQL sockets require the proxy running.
- Run Prisma migrations before starting the server.

## React Query cache not updating
- Confirm mutations invalidate the right keys (see `queryKeys` in `useApi.ts`).
- Ensure `QueryProvider` is wrapping the app (`src/app/(app)/layout.tsx`).

## "No QueryClient set" error
- Ensure `src/components/QueryProvider.tsx` is imported and used by `src/app/(app)/layout.tsx`.
