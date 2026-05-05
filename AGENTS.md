# monorepo rules for admin migration

- This repo is the target frontend workspace for the migrated admin.
- Target app path is `apps/admin` unless a better existing convention is clearly present.
- Vercel project `job-portal-monorepo` builds from the repository root; keep its commands in root `vercel.json`.
- Never commit Bitbucket credentials or tokens, even in comments; use Vercel env vars for private git dependencies.
- Use `apps/job-portal` as the primary reference for:
  - auth/session patterns
  - API client patterns
  - data fetching conventions
  - env/config conventions
  - form/table/filter patterns when applicable
- Do not import or reimplement legacy `api-js`.
- Use `apps/web-app` only as a legacy behavior/UI reference when needed.
- Prefer a thin typed API layer dedicated to the new admin.
- Extract shared code only when reuse is obvious and immediate.
- Before changes: list plan, touched files, risks, verification steps.
- After changes: run relevant lint/typecheck/tests only for touched frontend areas.
