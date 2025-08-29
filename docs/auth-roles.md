# Auth, Roles, and Scope

Exsense uses Clerk for authentication. Authorization is enforced primarily on the backend via NestJS guards; the frontend also gates UX and routes.

## Roles
- Roles are stored in Clerk user metadata (e.g., `publicMetadata.role`).
- Frontend uses the role to decide redirects after sign-in:
  - In `src/app/(app)/(login)/login/page.tsx`: learners → `/my-course`, experts/teachers → `/teacher-dash`.
- The UI will hide or show actions (e.g., "New Course") based on role, but the backend is the source of truth.

## Backend enforcement (source of truth)
- Guards live in `one-backend/src/auth/guards/*` (e.g., `TeacherGuard`, `StudentGuard`, `AdminGuard`, `InternalGuard`).
- Example guarded endpoints in `one-backend/src/courses/courses.controller.ts`:
  - `POST /api/courses` – Teacher only
  - `GET /api/courses/teacher/me` – Teacher only
  - `PUT /api/courses/:courseId` – Teacher only
  - `DELETE /api/courses/:courseId` – Teacher only
- Unauthenticated/unauthorized requests get `401/403` from the backend.

## Tokens and API calls
- `src/lib/apiclient.ts` reads `NEXT_PUBLIC_API_BASE_URL` and attaches `Authorization: Bearer <Clerk token>` when available.
- `src/lib/api.ts` exposes typed methods that map to backend routes.
- `src/hooks/useApi.ts` provides React Query hooks with cache keys and mutation patterns (invalidate on success, toast on error).

## Testing roles locally
1) Sign in with Clerk and set your role (via admin or a role-promotion endpoint if available).
2) Hit a teacher-only route from the UI (e.g., open `/teacher-dash` and create a course).
3) Verify the backend allows/denies via guard, regardless of what the UI shows.

## Key takeaway
- Scope/authorization exists in both frontend and backend, but the backend guards are authoritative. The frontend improves UX and routing; the backend enforces security.
