# Exsense Frontend – Getting Started

This guide helps you run the Exsense frontend locally and understand the moving pieces.

## Prerequisites
- Node.js 18+ and npm (or pnpm/yarn)
- Access to the backend API (NestJS "one-backend") and its database
- Clerk project (publishable and secret keys) for auth

## Setup
1) Copy env example and fill values:
```bash
cp env.example .env.local
```
- Set `NEXT_PUBLIC_API_BASE_URL` to the backend base URL (no trailing `/api`). Example: `http://localhost:3001`
- Provide Clerk keys: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`
- See `docs/environment.md` for all variables.

2) Install deps:
```bash
npm ci
```

3) Run dev server:
```bash
npm run dev
```
Open http://localhost:3000

4) Sign in via Clerk (social or email). On success:
- Learners redirect to `/my-course`
- Experts/teachers redirect to `/teacher-dash`
(Logic in `src/app/(app)/(login)/login/page.tsx`)

## Backend assumptions
- REST API lives at `${NEXT_PUBLIC_API_BASE_URL}/api/...` (set by `src/lib/apiclient.ts`)
- Protected endpoints require a valid Clerk token with role claims; backend guards enforce roles
- Health check at `${NEXT_PUBLIC_API_BASE_URL}/health`

If you’re running the backend locally:
- Configure `DATABASE_URL` for Postgres in `one-backend`
- Run Prisma migrations and start NestJS

## Project highlights
- API client: `src/lib/apiclient.ts`, `src/lib/api.ts`
- React Query provider: `src/components/QueryProvider.tsx` wired in `src/app/(app)/layout.tsx`
- Course creation UI: `src/components/CirriculumEditor.tsx` and route `src/app/(app)/teacher/create-course/page.tsx`

See also:
- `docs/architecture.md` – overview and data flow
- `docs/auth-roles.md` – how roles/scopes work end-to-end
- `docs/api-usage.md` – using hooks and mutations
- `docs/troubleshooting.md` – common issues and fixes
