# Frontend API Usage

This app uses a lightweight API service + React Query hooks to interact with the backend.

## Files
- `src/lib/apiclient.ts` – low-level `fetch()` wrapper with base URL and token
- `src/lib/api.ts` – typed `ApiService` methods for courses, enrollments, lessons, contents, reports, admin, health
- `src/hooks/useApi.ts` – React Query hooks for queries/mutations

## Patterns
- Queries:
```ts
const { data, isLoading, error } = useTeacherCourses();
```
- Mutations:
```ts
const createCourse = useCreateCourse();
createCourse.mutate({ title, description });
```
- Invalidation keys:
  - See `queryKeys` in `useApi.ts` (e.g., `courses`, `teacherCourses`, `lessons(courseId)`).

## Course flow example
1) Create course: `useCreateCourse()` → `POST /api/courses`
2) Create lessons: `ApiService.createLesson(courseId, { title })`
3) Add lesson content: `ApiService.addLessonContent(lessonId, data)`
4) Hooks invalidate related caches and show toasts on success/failure

## Error handling
- Errors surface via thrown `Error` in `apiclient.ts`
- Hooks show notifications with `sonner` (e.g., `toast.error(...)`)

## Health check
- `api.ts` exposes `healthCheck()` targeting `/health` for quick backend availability checks
