# Conventions

## Code style
- TypeScript across the app; prefer explicit types at public boundaries
- Components in `src/components/`; hooks in `src/hooks/`; libs/utils in `src/lib/`
- Use React Query for server state; keep local UI state minimal
- Use `queryKeys` from `src/hooks/useApi.ts` for consistent cache keys

## Naming
- Components: `PascalCase`, hooks: `useCamelCase`, files: `kebab-case.tsx`
- Keep `CirriculumEditor` misspelling consistent until a full rename is scheduled (touches many imports)

## API access
- Always go through `ApiService` in `src/lib/api.ts` and hooks in `src/hooks/useApi.ts`
- Do not hardcode `fetch()` calls with raw URLs in components

## Auth
- Read Clerk token via `apiclient.ts` and avoid passing tokens manually
- UI gating is helpful, but never rely on it for security—backend guards enforce roles

## Git & CI
- Keep PRs small and focused; update docs when adding new modules or env vars
- Prefer adding e2e or unit tests when touching guarded endpoints or auth flows
