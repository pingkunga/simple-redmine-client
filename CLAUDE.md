# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Critical rule

**Never run `git commit` (or `git push`).** The human always reviews and commits/pushes changes themselves. You may stage files, show diffs, and draft commit messages, but do not execute the commit or push command — stop and hand it back for the human to run.

## Commands

Package manager is **Bun** (`bun.lock` is authoritative; a stray `package-lock.json` also exists but isn't used for installs).

```bash
bun install              # install deps
bun run dev               # start dev server on http://localhost:3000
bun run build              # production build
bun run generate           # static generation
bun run preview            # preview production build locally
bun test                   # run the vitest suite (alias for `bun x vitest`)
bun x vitest <path>        # run a single test file, e.g. bun x vitest app/composables/useVersionValidation.test.ts
bun x vitest -t "<name>"   # run tests matching a name pattern
```

Docker build/run (see README.md for full examples with version tags):
```bash
docker build --pull -t bun-redmine:<tag> .
docker run -d -p 3000:3000 --env-file .\.env --name bun-redmine bun-redmine:<tag>
```

CI (`.github/workflows/DEV_TAG.yaml`) runs `bun x vitest --run --reporter=junit` on every tag push, then builds/pushes the Docker image.

## Architecture

This is a **Nuxt 4** app (Nuxt UI 4 + Tailwind v4) that acts as a thin client/dashboard on top of the **Redmine REST API**, with a secondary integration into **GitLab** for branch/event data. There is no local database for domain data — Redmine is the system of record; GitLab data is file-cached on disk.

### Layers

- `app/` — Nuxt UI layer (pages, components, composables, client utils). Pages under `app/pages/` map 1:1 to feature areas: `versions`, `issues`, `devtrackers`, `buildinvset` (Build Inventory Set / release requests), `buildnetcommon` (Build .NET Common requests), `clientsetting`, `admin/branches`, `admin/release-mail`.
- `server/api/` — Nuxt/H3 server routes (Nitro). These are the only place that talk to Redmine/GitLab directly; the frontend never calls Redmine/GitLab itself, always through `/api/*`.
- `server/utils/` — server-only business logic shared across routes (GitLab caching, mail sending/rendering, release automation, session handling, project config loading).
- `server/middleware/auth.ts` — single global auth gate (see Auth model below).
- `shared/types/` — `.d.ts` ambient types (`Version`, `Issue`, `Project`, `GitLab*`, etc.) shared between `app/` and `server/` without explicit imports (Nuxt auto-registers `shared/`).
- `public/Config/` and `public/IssueTemplate/` — JSON-driven configuration read at runtime via `server/utils/projectConfig.ts` (`readConfigJson`, `getSupportProjects`), e.g. `SupportProject.json` (which Redmine project IDs the app operates on) and per-tracker issue templates (e.g. `public/IssueTemplate/buildinvset/Default`). This is the mechanism for "supported projects" and tracker field templates — prefer extending these JSON configs over hardcoding IDs in code.

### Redmine integration pattern

`app/composables/useRedmineAPI.ts` is the central composable: it defines tracker ID constants (`TRACKER.PROGRAM_SPEC`, `FEATURE`, `DEFECT`, `BUILD_REQUEST`), maps raw Redmine JSON shapes (`RawVersion`, `RawIssue`, `RawProject`, `RawMembership`) to the app's internal types, and exposes both client-side helpers (calling internal `/api/*` routes via `useFetch`) and a server-side helper `createBaseRedmineHeader()` used by `server/api/*` routes to build the `X-Redmine-API-Key` header. Server routes call the Redmine REST API directly with `axios` using `config.public.redmineUrl` + this header (see `server/api/versions/index.get.ts` for the pattern: iterate `getSupportProjects()`, fetch per-project, de-dupe by ID).

Users can override the server's default Redmine token with their own personal access token: the client stores it (base64-"encrypted" via `useClientUtil`, in `localStorage`) and sends it in a custom header (`YOUR_OWN_REDMINE_API` = `x-my-redmine-api-key`) which `createBaseRedmineHeader` decrypts and swaps in.

### Auth model

`server/middleware/auth.ts` runs on every request:
- `/admin/*` UI routes require a session cookie (`server/utils/session.ts`, base64 JSON cookie with expiry — not cryptographically signed, treat as low-security by design).
- `/api/release/*` routes accept three ways in: an existing session, SSR/server-to-server calls (no client IP), a matching `x-internal-key` header for same-origin UI calls, or (for external automation like Jenkins) an IP-whitelisted (`automationAllowedIps`) request with a matching `x-api-key` header (`automationApiKey`). This is the path used by the release-notification/build-automation APIs documented in the README's `Invoke-RestMethod` examples.
- All other routes are open (protected only by network placement / Redmine token possession).

### GitLab branch cache

`server/utils/gitlabCache.ts` fetches all branches + `pushed`/`created` events for a GitLab project, merges branch creator info from cached events, and persists per-project JSON caches at `<gitlabCacheDir>/project-<id>.json` (mode controlled by `gitlabCacheMode`: `"file"` implemented, `"mongodb"` is a documented placeholder, not implemented). Syncing is incremental — `syncProjectEvents` merges newly fetched events into the existing cache by event ID rather than replacing it.

### Config / secrets

Runtime config is defined in `nuxt.config.ts` (`runtimeConfig`) and populated via `.env` — includes Redmine token, SMTP creds, admin credentials, automation API key/IP allowlist, and GitLab token/cache settings. `.env` is present locally but gitignored; never hardcode secrets into source.

### Testing

Vitest runs with the Nuxt test environment (`vitest.config.ts`, `environment: 'nuxt'`), not plain jsdom — this matters when writing new tests since Nuxt auto-imports (`useFetch`, `useRuntimeConfig`, etc.) are available without explicit imports. Existing tests live next to the code they cover (`*.test.ts` under `app/composables/` and `server/utils/`) rather than in a separate `tests/` tree — follow that convention for new tests.
