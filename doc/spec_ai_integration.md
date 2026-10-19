# AI Integration Spec — Chat page + MCP tool layer

Status: **Phase 1 direction approved; not yet implemented.** The contracts in **Task 0.5** (authorization, auth, MCP transport, bounds) must be closed before Task 1 begins. This document is the implementation spec; each task below is independently completable and checkpointed before moving to the next.

## Requirements (consolidated)

**Functional**
- Add a Chat page (`/chat`) to the app where a user asks natural-language questions about live Redmine/GitLab data.
- Expose the app's data-fetching logic as **real MCP protocol tools** (not just internal function calls) — usable both by the in-app Chat page and by external MCP clients (Claude Desktop, Claude Code, other agents).
- Phase 1 is **read-only**: `list_versions` (+ name-substring filter, since neither Redmine nor `/api/versions` filters by name), `get_issues_by_version` (accepts a numeric `versionId` or a version *name* like `8.9.15.4` and resolves the name itself, since Redmine has no name filter for issues), `get_issue_graph`, `list_projects`, `list_gitlab_branches`, `get_thisweek_releases`.
- Write tools (`create_devtracker_issue`, `create_buildinvset_issue`, `create_buildnetcommon_issue`, version create/update) are **Phase 2**, each gated behind an explicit confirmation step in the chat UI — not part of this spec's deliverable.
- Permanently **excluded from MCP at any phase**: `auto-create-build-inv` (bulk, irreversible), `send-release-mail` (real external email), `DELETE /api/versions/[id]` (destructive, no undo) — existing manual UX already covers these; an LLM-in-the-loop adds risk without adding value.

**UI**
- Use Nuxt UI's built-in Chat components (`UChatMessages`/`UChatPrompt`/`UChatPromptSubmit`) — a chosen requirement, not a default, and pulls in the `ai` package as a real dependency since those components consume its `UIMessage`/`parts[]` shape.
- Add a Markdown renderer (none exists today) for chat output, sanitized before render.
- One-line nav entry added to the existing sidebar.

**Multi-provider LLM support**
- Must support **Claude, Gemini, OpenAI, Azure OpenAI, Ollama, and LM Studio** behind one uniform codepath (the `ai` SDK's provider-adapter abstraction).
- Provider is **fixed via server-side config for Phase 1** (env var, admin sets before deploy + restart) — **not** a per-session picker in the chat UI.
- Local providers (Ollama/LM Studio) are conditional on a real spike confirming tool-calling actually works against the intended local model — flagged as the requirement most likely to need renegotiation, not assumed to just work.

**Guardrails / non-functional**
- **Read-only tools are scoped by the Redmine/GitLab token's own permissions, not by the `Support*.json` allowlists** (decision: the token already defines what is visible). The safety property is *read operations only*: every tool issues GET requests only, and there is no create/update/delete/mail tool; this is enforced by tests. `SupportProject.json` is used only as a **default search scope** when a caller gives no project (a convenience, not a security boundary). The fail-closed `assert*Supported` helpers remain for Phase 2 write tools, which must validate against the allowlists.
- `/api/chat` and `/api/mcp/*` each need their own auth gate — the app has almost no auth today outside `/admin` and `/api/release/*`, and each caller type (in-app page vs. external MCP client) needs a scheme it can actually satisfy.
- Per-user Redmine identity (forwarding a user's personal API key instead of the shared server token) is explicitly **deferred to Phase 3**, with the Phase-1 shared-token exposure trade-off called out for human sign-off before shipping — not silently accepted.
- Vitest coverage per existing repo convention (tests alongside the code, `environment: 'nuxt'`) for every new tool handler, the provider factory, and the chat route.

Full detail for each of these is in the sections below.

## Implementation Tasks

Tasks 0–6 (including 0.5) are the Phase-1 (read-only) deliverable; Tasks 7–8 are verification spikes required before calling Phase 1 done; Task 9 is explicitly **not built now** — listed so scope stays visible.

**Task 0 — Prerequisite refactor + guardrails**
- Refactor `server/utils/releaseService.ts`'s `getThisWeekVersions(event, projectId)` to `getThisWeekVersions({ redmineUrl, headers, projectId, now })`, the event-agnostic shape used by `server/utils/issueGraph.ts`. Remove the H3 `event` and the `getRequestHeaders(event)` call (that is the personal-key header path); callers pass extracted args via the `releaseServiceEvent.ts` adapter. Only the `"NEXT"` mode is exposed; only Sunday due dates count; the working day is the preceding Friday. The date logic itself is **unchanged**: inject `now` (clock) for deterministic tests, nothing else.
- **Timezone is a deployment setting, not code.** The existing date logic assumes the server runs in Asia/Bangkok (or UTC); set `TZ=Asia/Bangkok` in the container at deploy time. No timezone logic is added to the service.
- Add `assertProjectSupported(projectId)` and `getSupportTrackers()`/`assertTrackerSupported(trackerId)` to `server/utils/projectConfig.ts` (kept for Phase 2 write tools; Phase 1 read tools do not call them), **fail-closed**: throw when the allowlist is empty/unreadable or the id isn't in it.
- Add `getSupportGitLabProjects()`/`assertGitLabProjectSupported(gitlabProjectId)` reading `public/Config/SupportGitLabProject.json`, same fail-closed rule. Build on `readConfigJson` (returns `null` on failure) and treat `null` or empty as a rejection.
- ✅ **Checkpoint**: existing `/api/release/*` routes still pass their current tests unchanged in behavior; new Vitest cases for the assert helpers (project, tracker, GitLab project) cover (a) valid id passes, (b) invalid id throws, (c) empty/unreadable config throws (not silently passes). `getThisWeekVersions` tests pass a fixed `now`.

**Task 0.5 — Authorization & transport contract** (must be done before Task 1; closes the "Review follow-up" items below)
- **Session hardening.** `server/utils/session.ts` stores an unsigned base64 JSON cookie, so anyone can forge a session; "session-authenticated" is not a boundary until this is fixed. Sign the cookie with HMAC-SHA256 using the existing (previously unused) private `runtimeConfig.adminSessionSecret`, set in production via `NUXT_ADMIN_SESSION_SECRET`; reject unsigned/invalid/expired cookies. Fail-closed: an empty secret, or the shipped placeholder in production, makes login throw and makes verification return "no session". This also affects `/admin` login: existing cookies become invalid after deploy (users re-login once).
- **`/api/chat` auth (decision: open to anonymous visitors).** No login required, consistent with the rest of the app's open APIs (the six tools are read-only; their scope is the shared token's permissions). POST requires a same-origin request (`Origin`/`Sec-Fetch-Site`), which stops other websites driving a visitor's browser but is **not** an anti-abuse control (scripts can forge `Origin`); abuse (LLM cost, flooding) is handled by the mandatory rate/size limits in the chat route (Task 5). Do **not** use the `!clientIp` "SSR" bypass and do **not** use `config.public.internalApiKey` (public config ships to the browser; it is not a secret). Any future write tool (Phase 2) must require a signed session even though chat is open. `server/middleware/auth.ts` currently only gates `/api/release/`, so add explicit branches for `/api/chat` and `/api/mcp`.
- **`/api/mcp` auth.** Key-only: bearer / `x-api-key` checked against `runtimeConfig.mcpApiKey` (distinct from `automationApiKey`) with a timing-safe compare. No reliance on client IP or `X-Forwarded-For` (client-spoofable).
- **MCP HTTP contract.** Single endpoint `/api/mcp`, **stateless** Streamable HTTP: a `createMcpServer()` factory builds a fresh `McpServer` + transport per POST (`sessionIdGenerator: undefined`), `GET`/`DELETE` return 405, resources are closed when the request ends. Use the SDK's web-standard transport (`webStandardStreamableHttp`) with `toWebRequest(event)`. The in-app chat route gets its own `createMcpServer()` instance over `InMemoryTransport`; one `McpServer` instance is never shared across transports.
- **Scope = token permissions (decision).** No ownership checks and no graph truncation by project: whatever the shared Redmine/GitLab token can read, a tool can return. Exposure is limited instead by read-only operations, result caps, and omitting free-text bodies (issue descriptions) from outputs, which also shrinks the prompt-injection surface. **One exception (user decision):** `get_issues_by_version` returns each issue's Impact Note (custom field "Developer's Comment") as plain text, capped at 400 characters (`impactNoteTruncated` flags a cut), so the model can summarize release impact. This sends developer-written text to the cloud LLM and is an untrusted-text channel; the system prompt treats it as data. See the sign-off in "Open item carried forward".
- **Read-only enforcement.** Tests assert that tool handlers only ever call `axios.get` (never post/put/delete/request) and that the registry contains no write/delete/mail tool (`send_release_mail`, `auto_create_build_inv`, `delete_version`, or any create/update verb).
- **Bounded schemas and failure semantics.** Every tool: zod input with max string lengths, result limits/pagination, a per-call timeout, and typed output. On upstream partial failure, return `partial: true` + `failedScopes`, or fail — never appear complete.
- **Chat safety.** The system prompt treats tool output as untrusted data (Redmine text may carry prompt injection). Cap tool rounds (e.g. `stopWhen` step limit), limit request/message size, abort on client disconnect, **rate-limit per client plus a daily cap on LLM calls (mandatory, since chat is anonymous; client key from `getRequestIP` without trusting `X-Forwarded-For` unless a deployer flag says the proxy overwrites it)**, and write audit logs that exclude secrets and prompt/tool payloads. **Exception (decided later, for improving prompts/tools):** a *separate* transcript sink (`server/utils/chatTranscript.ts`) records the last user question, the answer, and tool inputs/outputs plus the client IP to `data/chat-logs/YYYY-MM-DD.jsonl`; it is disk-only (no UI), deleted after 30 days, git-ignored, and disclosed on the `/chat` page. The stdout audit line stays payload-free.
- **Markdown sanitization.** Specify where it runs under Nitro SSR (DOMPurify needs a DOM: use `isomorphic-dompurify`, or render client-only) so there is no unsanitized server-rendered `v-html` path.
- ✅ **Checkpoint**: each bullet above is reflected in the Task 1–6 text; forged-cookie, missing-origin and wrong-key cases are listed in Task 3's tests.

**Task 1 — MCP tool registry (the 6 read-only tools)**
- Implement `server/utils/mcpTools/{listVersions,getIssuesByVersion,getIssueGraph,listProjects,listGitlabBranches,getThisWeekReleases}.ts`, each a pure handler with a zod input schema, wrapping the logic already cataloged in "Phase 1 tools" below (reusing `issueGraph.ts`, `gitlabCache.ts`, refactored `releaseService.ts` directly rather than re-implementing).
- `list_versions` gets the optional `name` substring filter (applied post-fetch). `get_issues_by_version` takes `versionId` (used as-is) or `versionName` (resolved inside the tool by exact, case-insensitive match via the `list_versions` handler; an ambiguous, near-miss or missing name returns `resolved: false` with up to 10 candidates instead of guessing). The model is not relied on to chain tools.
- `server/utils/mcpTools/registry.ts` exports `{name, description, inputSchema, handler}[]` for all six. Each handler follows the Task 0.5 contract (bounded input/output, timeout, `partial` semantics, GET-only).
- ✅ **Checkpoint**: one `*.test.ts` per handler (repo convention: alongside the code) covering happy path, input validation, result caps, **partial-failure** path and a **GET-only** assertion; `bun x vitest server/utils/mcpTools` green.

**Task 2 — Real MCP server**
- Build a `createMcpServer()` factory (`@modelcontextprotocol/sdk@1.32.1`) that registers every registry entry with `registerTool(...)` (`server.tool()` is deprecated in this SDK version).
- Expose it two ways: (a) linked `InMemoryTransport` pair for the in-app chat route (Task 5) — no HTTP hop; (b) stateless Streamable HTTP at `server/api/mcp.ts` for external clients, per the Task 0.5 contract (fresh server + web-standard transport per POST, `GET`/`DELETE` → 405).
- ✅ **Checkpoint**: a smoke test asserts all 6 tools register with valid schemas; manually connecting `mcp-inspector` (or equivalent) to the HTTP endpoint lists all 6 tools with correct descriptions/schemas.

**Task 3 — Auth gates for the new routes**
- Extend `server/middleware/auth.ts` per Task 0.5: `/api/chat` is open to anonymous visitors but requires a same-origin check on POST (it does **not** reuse the `/api/release/*` gate, the `!clientIp` bypass or `internalApiKey`); `/api/mcp` gets key-only bearer/`x-api-key` auth against a new `runtimeConfig.mcpApiKey` (distinct from `automationApiKey`) with a timing-safe compare.
- Implement the HMAC session signing from Task 0.5 (`runtimeConfig.adminSessionSecret`) in `server/utils/session.ts`.
- ✅ **Checkpoint**: automated tests cover chat with same-origin POST (allowed, no session), foreign/missing `Origin` (403), MCP with no key / wrong key / unset key (401) and the valid key (pass-through); the session tests cover forged/unsigned cookies being rejected for `/admin`. Existing `/admin` login still works with signed cookies.

**Task 4 — Multi-provider LLM abstraction**
- `server/utils/llmProvider.ts`: factory reading `runtimeConfig.llmProvider` (`anthropic|google|openai|azure|ollama|lmstudio`) + per-provider keys, returns an `ai`-SDK `LanguageModel`. Add the pinned adapter packages listed under "New dependencies" and the `runtimeConfig` keys listed under "LLM provider abstraction" below.
- Ollama/LM Studio use `@ai-sdk/openai-compatible` (`createOpenAICompatible({ baseURL })`). Do not use plain `createOpenAI()(modelId)` for them: in `@ai-sdk/openai@3` it defaults to the **Responses API**, which local servers generally don't implement (`.chat(modelId)` would also work).
- Factory throws a clear startup error if the configured provider's required keys are missing.
- ✅ **Checkpoint**: unit test per provider branch (6 cases) asserting correct adapter call + config mapping, plus a missing-required-key case that throws (not a silent runtime failure on first chat message).

**Task 5 — Chat route**
- `server/api/chat.post.ts`: connects as an MCP client (`createMCPClient` from `@ai-sdk/mcp@1`, which accepts a custom `MCPTransport`; a `JSONRPCMessage` type cast for `InMemoryTransport` may be needed) over the Task 2 in-memory transport, converts the tool list for `streamText({ model, tools, messages })` (model from Task 4's factory), streams the response back. If the in-memory transport proves incompatible at runtime, fall back to the MCP SDK `Client` plus manual tool conversion. Apply the Task 0.5 chat-safety limits (untrusted-tool-output system prompt, step cap, size limit, abort, rate limit, audit log).
- ✅ **Checkpoint**: route-level test mocking the provider adapter and MCP client asserts the tool-calling loop (model requests tool → route executes via MCP client → result fed back → final answer) and the streaming response shape.

**Task 6 — Chat page & UI**
- `app/pages/chat.vue`: Nuxt UI `UChatMessages`/`UChatPrompt`/`UChatPromptSubmit` + the `Chat` class from `@ai-sdk/vue@3` (this major exports `Chat`, not `useChat`) pointed at `/api/chat`. `@nuxt/ui@4.4.0` expects `ai@^6.0.42`; install the ai-6 line pinned under "New dependencies" (npm latest is `ai@7`, which does not match).
- Add a sanitized Markdown renderer (`markdown-it` + DOMPurify, SSR-safe per Task 0.5) for message content, with XSS tests (script tags, `javascript:` URLs, SVG/event-handler payloads).
- Add the nav entry in `app/components/sidebar/sidebarItems.ts`.
- ✅ **Checkpoint**: `bun run dev`, open `/chat`, and for **each of the 6 tools** ask at least one question that exercises it (the 5 examples in "What Phase 1 actually lets someone ask" plus a `list_versions`-by-name question), confirm correct tool selection and rendered (sanitized) markdown output; confirm a malformed id (non-numeric) is refused with a visible error, not silently dropped.

**Task 7 — Local-provider spike (Ollama / LM Studio)**
- Run one real end-to-end tool call against the intended local model via `createOpenAICompatible({ baseURL })` (chat-completions, not the Responses API).
- ✅ **Checkpoint**: pass/fail recorded explicitly. Fail ⇒ decide before Phase 1 sign-off: swap to a dedicated community provider package, or drop that provider from the supported list — do not ship an untested claim of support.

**Task 8 — External MCP client verification**
- Connect an external MCP client (Claude Desktop config, or `mcp-inspector`) to `/api/mcp/*` using the Task 3 bearer token.
- ✅ **Checkpoint**: external client lists and successfully executes at least one tool call end-to-end, independent of the chat page — this is the concrete proof of the "real MCP, usable externally" requirement.

**Task 9 — Explicitly deferred (not part of this deliverable)**
- Phase 2: write tools (`create_devtracker_issue`, `create_buildinvset_issue`, `create_buildnetcommon_issue`, version create/update), each behind a confirmation-in-the-loop UX.
- Phase 3: per-user Redmine identity forwarding, tool-call transcript display in the chat UI, chat history persistence strategy.
- Permanently excluded, any phase: `auto-create-build-inv`, `send-release-mail`, `DELETE /api/versions/[id]`.

## Context

README's "Plan List" roadmap already lists `Add MCP` and `Add Chat` as future work — nothing is built yet (verified: no AI/LLM/MCP dependency anywhere in `package.json`, no AI keys in `nuxt.config.ts` `runtimeConfig`, no chat/markdown-rendering code in `app/`). The goal: let a user ask an LLM questions about live Redmine/GitLab data (versions, issues, releases, branches) from a new Chat page inside the app, with the LLM driving that data access through **real MCP tools** — not just ad-hoc internal function calls — so the same tool surface is also usable by external MCP clients (Claude Desktop, Claude Code, another agent) later.

Decisions locked in before this spec:
1. **Build a real MCP server/protocol from Phase 1** (not deferred) — the tool layer is a genuine MCP endpoint, not just internal wiring.
2. **Phase 1 scope is read-only** — no write/mutating tools yet.
3. **Chat UI uses Nuxt UI's built-in Chat components** (`UChatMessages`/`UChatPrompt`), which requires adopting the Vercel `ai` package as a real dependency (its `UIMessage`/`parts[]` shape is what those components consume).
4. **Multiple LLM providers must be supported: Claude, Gemini, OpenAI, Azure OpenAI, Ollama, LM Studio.** Provider selection is **fixed via server config for Phase 1** (an admin sets it before deploy, e.g. `LLM_PROVIDER=anthropic` in `.env`; changing provider means changing config + restart) — not a per-session dropdown in the Chat UI. The `ai` package's provider-adapter abstraction makes one codepath support all six without per-provider branching in the chat route itself (see "LLM provider abstraction" below).

## What Phase 1 actually lets someone ask

| Example question in `/chat` | Tool(s) invoked |
|---|---|
| "version ไหนขึ้นวันศุกร์นี้ ใครดูแล" | `get_thisweek_releases` |
| "issue #1234 ถูก block โดยอะไรอยู่บ้าง" | `get_issue_graph` |
| "branch นี้ใครสร้าง เมื่อไหร่" | `list_gitlab_branches` |
| "สรุป issue ทั้งหมดใน version 8.9.15.4 ให้หน่อย" | `get_issues_by_version` with `versionName` (the tool resolves name → id itself; if the name is ambiguous it returns candidates for the model to confirm with the user) |
| "project ไหนบ้างที่ทีมดูแลอยู่" | `list_projects` |

Everything above is read/summarize only — no create/update/delete capability exists in Phase 1. "ช่วยร่าง build request ให้ version นี้" and similar write requests are explicitly Phase 2, gated behind a confirmation step, not part of this spec's deliverable.

## Architecture

**One tool registry, two protocol-correct consumers — both real MCP, not a shortcut.**

The chat route becomes an **MCP client** that talks to this app's own **MCP server**, and the `ai` SDK's MCP-client support (`createMCPClient` from `@ai-sdk/mcp@1`, the package that pairs with `ai@6`) is used to turn the MCP server's tool list directly into `ai` SDK tool definitions for `streamText({ tools })`. This gets "real protocol" and "chat page" from the same source of truth with no duplicate tool-calling logic.

```
server/utils/mcpTools/*.ts     ← pure, event-agnostic tool handlers (zod input schema + handler),
                                   one file per tool, *.test.ts alongside (repo convention)
server/utils/mcpTools/registry.ts  ← exports the list of {name, description, inputSchema, handler}

server/utils/mcpServer.ts      ← createMcpServer() factory: builds a fresh McpServer from the registry
                                   (never one shared instance across transports)

server/api/mcp.ts              ← stateless Streamable HTTP (new server + transport per POST) for
                                   *external* MCP clients (Claude Desktop, etc.) — this route is only
                                   for those external clients; the in-app chat page never calls it
                                   (see the in-memory transport note below)

server/api/chat.post.ts        ← MCP *client* connected via the MCP SDK's **linked in-memory transport**
                                   to its own createMcpServer() instance (real MCP protocol, zero HTTP
                                   hop, no self-request through the new auth gate) + ai SDK streamText(),
                                   provider adapter swappable, streams the response back to the browser

app/pages/chat.vue             ← Nuxt UI UChatMessages/UChatPrompt + `Chat` class from @ai-sdk/vue
```

Why this shape and not the alternatives considered:
- A standalone MCP server package (separate process calling this app's HTTP routes, or importing `server/utils` as a shared lib) was rejected — this app has never had a second deployable, and it would double the already-open auth surface for no real benefit at this scale.
- Building the registry as plain internal functions with no protocol (the "internal tool-calling" option) was rejected — real MCP is a requirement from day one.

## LLM provider abstraction

`server/utils/llmProvider.ts` — a single factory (e.g. `getLanguageModel()`) that reads `runtimeConfig.llmProvider` (one of `anthropic | google | openai | azure | ollama | lmstudio`) plus that provider's own config keys, and returns an `ai`-SDK `LanguageModel` instance. `server/api/chat.post.ts` calls this factory once and never branches on provider itself — `streamText({ model, tools, messages })` is identical regardless of which provider is configured.

Adapter packages needed (the `ai` SDK's whole point is a uniform `LanguageModel` interface across these):
- `@ai-sdk/anthropic` — Claude.
- `@ai-sdk/google` — Gemini.
- `@ai-sdk/openai` — OpenAI.
- `@ai-sdk/openai-compatible` — **Ollama** and **LM Studio** via `createOpenAICompatible({ baseURL })`, since both expose an OpenAI-compatible chat-completions endpoint; typically no API key. Plain `createOpenAI()(modelId)` is avoided here because in `@ai-sdk/openai@3` it defaults to the Responses API.
- `@ai-sdk/azure` — Azure OpenAI, kept separate from `@ai-sdk/openai` because Azure's auth shape differs (resource name + deployment name + API version, not a plain API key + model string).

`nuxt.config.ts` `runtimeConfig` additions: `llmProvider`, `llmModel`, and per-provider secrets/endpoints as needed — `anthropicApiKey`, `googleApiKey`, `openaiApiKey`, `azureApiKey`/`azureResourceName`/`azureDeployment`, `ollamaBaseUrl`, `lmstudioBaseUrl` — all following the existing `smtpPass`/`gitlabToken` pattern (private config, `.env`-sourced, never hardcoded). Only the configured provider's keys need to be set; the factory should throw a clear startup-time error if `llmProvider` is set to something whose required keys are missing, rather than failing opaquely on first chat request.

Note for Ollama/LM Studio: these typically run on `localhost` or a LAN machine, not a cloud endpoint — the Nitro server process needs actual network reachability to wherever that server runs; this is a deployment-environment detail to confirm before relying on either as the configured provider, not a code change.

**Spike before committing to all six providers**: this whole feature is built around tool-calling — a provider that can't emit tool calls makes the chat page a plain chatbot with none of the six tools working. Ollama and LM Studio's OpenAI-compatible endpoints have tool-call support that varies by which model is actually loaded, unlike the cloud providers where it's guaranteed. Before Phase 1 is considered done, run one real end-to-end tool-call through whichever local model is the intended target via `createOpenAICompatible({ baseURL })`, and confirm it works. If it doesn't, `@ai-sdk/openai-compatible` is the wrong adapter for that target and a dedicated community provider package (or dropping that provider from the supported list) is needed — this is flagged as the one item most likely to change scope after the fact, so it should be resolved early, not assumed.

## Prerequisite refactor

`server/utils/releaseService.ts`'s `getThisWeekVersions(event, projectId)` currently takes an H3 `event`, imports the app composable `useRedmineAPI` and reads request headers (the personal-key path) — not event-agnostic, can't be a clean tool handler as-is. Refactor it to the same shape already used by `server/utils/issueGraph.ts`'s `fetchIssueGraph({ redmineUrl, headers, ... })`: plain args in (`{ redmineUrl, headers, projectId, now }`), no H3 event, date logic unchanged; timezone is set by the container's `TZ` (see Task 0). Do this once, shared by both the existing `/api/release/*` routes (which keep working, just pass the extracted args) and the new `get_thisweek_releases` tool.

## Guardrails (fail-closed, matching existing config pattern)

**Phase 1 read tools are token-scoped.** They do not validate ids against `SupportProject.json`/`SupportTracker.json`/`SupportGitLabProject.json`; the Redmine and GitLab tokens define what is readable. What is enforced instead: GET-only calls, no write/delete/mail tool in the registry (permanent exclusions below), bounded results, timeouts, no free-text bodies in output (except the capped plain-text Impact Note, see Task 0.5), and the chat route's rate/size limits.

**Phase 2 write tools must be allowlisted and fail-closed.** `server/utils/projectConfig.ts` already provides `assertProjectSupported`, `assertTrackerSupported` and `assertGitLabProjectSupported`, which throw when the allowlist is empty/unreadable or the id isn't in it (`getSupportProjects()` returns `[]` on any read error, so "skip the check when empty" would silently disable the guard). Every future write tool calls them before touching Redmine, and requires a signed session.

## Phase 1 tools (read-only only, per the locked-in decision)

| Tool | Wraps | Notes |
|---|---|---|
| `list_versions` | `GET /api/versions` logic | filter by project/status; when no project is given, searches the projects in `SupportProject.json` (default scope, not a boundary; if that list is empty the caller must pass `projectId`). Per-project failures are reported as `partial`. Adds an optional `name` (substring) filter applied **in the tool handler after fetching**, since neither the underlying Redmine API nor `/api/versions` supports filtering by version name — this keeps the token cost of "find version 8.9.15.4" down without changing the HTTP route's contract. |
| `get_issues_by_version` | `GET /api/issues/issue-version` logic | Takes `versionId` (used as-is, e.g. when the user wrote "id=6532") or `versionName` exactly as typed (e.g. "8.9.15.4"). Redmine's issues API has no name-based filter and versions can only be listed per project, so the tool resolves the name itself via the `list_versions` handler (default scope = `SupportProject.json` projects, or the optional `projectId`): exactly one exact match proceeds; several (same name in two projects), only near matches (`8.9.15.3` vs `8.9.15.30`), or none return `resolved: false` + `reason` + candidates so the model can ask the user. This avoids depending on the model to chain two tools. |
| `get_issue_graph` | `server/utils/issueGraph.ts` (`fetchIssueGraph`) | already event-agnostic + tested — used unchanged, token-scoped |
| `list_projects` | `GET /api/projects`, `.../support` logic | lists projects visible to the token (capped, optional name filter); an empty or failed fetch is an error, not `[]` |
| `list_gitlab_branches` | `server/utils/gitlabCache.ts` (`getGitLabBranches`) | users rarely know a GitLab project id, so `projectId`/`projectName` are optional: an id wins, a name is matched against `SupportGitLabProject.json`, and with neither the tool searches every project in that file (default scope, not a boundary; other projects need `projectId`). Results carry their project and are merged newest-first; a failing project is reported as `partial`. Commit titles/messages and author emails are not returned. Caveat: `getGitLabBranches` is read-only toward GitLab but refreshes the local cache file as a side effect, and has no timeout of its own, so the tool wraps it in a 30 s timeout. |
| `get_thisweek_releases` | `server/utils/releaseService.ts` (after refactor above) | "this week" = next 7 days (existing logic; server `TZ` set at deploy) |

Explicitly **out of scope for any phase**, not just deferred (irreversible/high-blast-radius, existing manual UX already covers them): `POST /api/release/auto-create-build-inv`, `POST /api/release/send-release-mail`, `DELETE /api/versions/[id]`. Other write endpoints (`create_devtracker_issue`, `create_buildinvset_issue`, `create_buildnetcommon_issue`, version create/update) are real Phase 2 candidates but not built now.

## Auth for the new routes

Two different callers need two different gates:

Details live in **Task 0.5**; summary:

- **`/api/chat`** (called only by this app's own `chat.vue` page): **open to anonymous visitors**, with a same-origin check on POST and rate/size limits in the route (see Task 0.5 / Task 5). It does not reuse the `/api/release/*` gate: the `!clientIp` "SSR" bypass proves nothing, and `config.public.internalApiKey` ships to the browser bundle, so it is not a secret. The signed session (HMAC) still protects `/admin` and is required for any future write tool.
- **`/api/mcp`** (called by external MCP clients — Claude Desktop, Claude Code, another agent): those clients cannot send a session cookie and won't be on the `automationAllowedIps` list. Needs a **bearer token / `x-api-key` header** checked (timing-safe) against a new dedicated `mcpApiKey` (distinct from `automationApiKey` so access can be revoked independently of Jenkins). Key-only: no IP rule, since `X-Forwarded-For` is client-spoofable. Its own branch in `server/middleware/auth.ts`.

## Frontend

- `app/pages/chat.vue` — new page, rendered through the existing `app/layouts/default.vue` automatically. Uses Nuxt UI's `UChatMessages`/`UChatPrompt`/`UChatPromptSubmit` plus a `Chat` instance from `@ai-sdk/vue` pointed at `/api/chat` (this pairing is why `ai` is required, not optional, once Nuxt UI's chat components are the chosen UI). **Verified**: `@nuxt/ui@4.4.0` expects `ai@^6.0.42`; in that line `@ai-sdk/vue@3` exports the `Chat` class (no `useChat`). npm `latest` is `ai@7`/`@ai-sdk/vue@4`, which would break `UChatMessage`'s `UIMessage`/`parts[]` typing — install the pinned ai-6 set under "New dependencies".
- `app/components/sidebar/sidebarItems.ts` — add a one-line `{ title: "Chat", icon: ..., to: "/chat" }` entry.
- Markdown rendering: no renderer exists in this app today (Tiptap is edit-only). Add a small renderer (`markdown-it` + `DOMPurify`, sanitizing before `v-html`) since LLM output — and tool results echoing Redmine free text — must not be trusted as safe HTML. This is the lightest addition consistent with this app's existing small-utility dependencies (`file-saver`, `xlsx`); revisit if Nuxt UI's `Prose*`/`@nuxtjs/mdc` path is preferred later.

## New dependencies

Pin the **ai-6 line** (every package below depends on `@ai-sdk/provider-utils@4.0.60`; do not `bun add` bare names, which would pull the ai-7 line). Versions checked on npm; re-check for newer patches in the same major at install time:

- `@modelcontextprotocol/sdk@1.32.1` (zod `^3.25 || ^4` — compatible with the repo's zod 4) — MCP server + client transports.
- `ai@6.0.308`, `@ai-sdk/vue@3.0.308` (provides `Chat`), `@ai-sdk/mcp@1.0.96` (`createMCPClient`).
- Provider adapters: `@ai-sdk/anthropic@3.0.132`, `@ai-sdk/google@3.0.134`, `@ai-sdk/openai@3.0.129`, `@ai-sdk/azure@3.0.140`, `@ai-sdk/openai-compatible@2.0.84` (Ollama/LM Studio).
- `markdown-it` + `isomorphic-dompurify` (or `dompurify` with client-only rendering) — chat message rendering, SSR-safe per Task 0.5.
- `nuxt.config.ts` `runtimeConfig`: `llmProvider`, `llmModel`, `mcpApiKey`, and per-provider secrets/endpoints as listed in "LLM provider abstraction" above — never hardcoded, `.env`-sourced like the existing `smtpPass`/`gitlabToken` keys.

## Testing (Vitest, `environment: 'nuxt'`, tests alongside code per repo convention)

- One `*.test.ts` per tool handler in `server/utils/mcpTools/` — mock the underlying util, assert the happy path, input validation, result caps, partial-failure reporting, and that only GET requests are made.
- Test for `releaseService`'s refactored signature (update/extend existing test if present, else add one matching `issueGraph.test.ts`'s style).
- Route-level test for `server/api/chat.post.ts` mocking the provider adapter and the MCP client, asserting the tool-calling loop and streaming shape.
- Test for `llmProvider.ts`'s factory: each of the six `llmProvider` values resolves to the right adapter call with the right config keys, and an unset/incomplete required key throws a clear error rather than failing silently on first request.
- Smoke-test the MCP server route registers all Phase 1 tools with valid schemas.

## Verification

- `bun test` (full suite) and targeted `bun x vitest server/utils/mcpTools` / `bun x vitest server/api/chat.post.test.ts` runs green.
- `bun run dev`, log in as needed, open `/chat`, ask a question that requires each Phase 1 tool at least once (e.g. "what versions are due this week for project X", "show me branches for GitLab project Y", "graph the relations around issue Z") and confirm correct tool selection, correct data, and that a malformed id is refused rather than silently ignored.
- Confirm `/api/chat` works without login from the app's own page but a cross-origin POST is refused (403) and the rate limit returns 429 when exceeded, and `/api/mcp` works only with a valid `mcpApiKey` (otherwise 401).
- Ask at least one question that exercises **each of the six tools** and confirm correct selection and data.
- Manually connect an external MCP client (e.g. Claude Desktop's MCP config with the bearer token, or `mcp-inspector`) to `/api/mcp` and confirm the same six tools list and execute correctly outside the chat page, since "real external-client-usable MCP" was the explicit goal.
- Run the Ollama/LM Studio tool-calling spike (see "LLM provider abstraction") and record the result before calling Phase 1 done.

## Open item carried forward (not blocking Phase 1 architecture)

Per-user Redmine identity: chat/MCP tool calls run under the shared server `redmineToken` in Phase 1 (the personal-key header `x-my-redmine-api-key` has no path into a server-initiated call). Because chat is open to anonymous visitors, **any visitor** can have *everything the shared Redmine/GitLab token can read* returned and summarised, and that data is sent to the configured LLM provider (a cloud provider, per the decision taken) — a deliberate choice that the user made knowing the token sees many projects, and is **flagged for explicit human sign-off before Phase 1 ships to production**. The existing `redmineToken` is used as-is; a separate read-only chat token was considered and declined. Controlling what that token can see is the deployer's responsibility. Forwarding a logged-in user's personal key is real Phase 3 work.

## Review follow-up — resolved into Task 0.5

Decisions taken: `/api/chat` is open to anonymous visitors (same-origin + rate limits; supersedes item #2 below); signed session cookie kept for `/admin` and future write tools; tools are scoped by token permissions with GET-only enforcement, not allowlists (supersedes items #1 and #4 below); "this week" = existing next-7-days logic with timezone set via container `TZ`; MCP over HTTP is stateless. The items below are kept as the original review record; each is now covered by Task 0.5 or the task it names.

The Phase 1 direction remains approved, but the following implementation contracts had to be decided and documented before Task 1 begins:

1. *(Superseded: Phase 1 read tools are token-scoped; no ownership checks.)* **Enforce authorization from resource ownership, not only tool input.** A caller can supply a numeric `versionId` or `issueId` without ever calling `list_versions`. `get_issues_by_version` must resolve the version's owning Redmine project and reject it unless that project is supported. `get_issue_graph` must validate the root issue's project and must never return a node or relation from an unsupported project; choose and test either truncation with an explicit reason or complete rejection when traversal crosses the allowlist boundary.
2. **Use a real authentication boundary for `/api/chat`.** Do not treat a missing client IP as proof of SSR, and do not rely on `config.public.internalApiKey`: public runtime config is visible to browsers and is not a secret. Define `/api/chat`'s access model explicitly. *(Superseded: the user chose anonymous access with same-origin checks and rate limiting; see Task 0.5.)*
3. **Specify the external MCP HTTP contract.** Replace the placeholder `[transport]` route description with the selected Streamable HTTP endpoint shape, supported HTTP methods, session identifier/transport ownership, concurrent-client behavior, and disconnect cleanup. Do not assume one shared `McpServer`/transport instance can safely serve all requests without a lifecycle design.
4. *(Superseded: Phase 1 read tools are token-scoped.)* **Scope `list_projects` and GitLab branches to allowlists.** `list_projects` must return only configured supported projects (or their intersection with currently accessible Redmine projects), not every project returned by Redmine. `list_gitlab_branches` must validate its GitLab project ID against `SupportGitLabProject.json` with a fail-closed helper matching the Redmine project/tracker helpers.
5. **Define bounded schemas and failure semantics for every tool.** Each tool needs typed input/output contracts, pagination or result limits, maximum string length, timeout, and a policy for upstream partial failure. Results must either report `partial`/failed scopes explicitly or fail; they must not silently appear complete after a Redmine/GitLab fetch fails.
6. **Define release-date semantics and inject time for tests.** The existing release utility selects Sunday due dates while rendering the preceding Friday as the working day. State the intended meaning of “this week” and its timezone, include it in tool output, and pass a clock/`now` dependency into the refactored utility for deterministic tests.
7. **Treat tool results as untrusted data.** Redmine descriptions, issue subjects, and branch names can contain prompt-injection text. The chat system instructions must treat tool output as data rather than instructions. Add bounded tool rounds, request/message-size limits, cancellation, timeouts, rate limiting, and audit logs that exclude secrets and sensitive prompt/tool payloads.
8. **Make Markdown sanitization server/client-safe.** Document where sanitization runs under Nitro SSR and add XSS tests for unsafe HTML, URL schemes, and SVG/event-handler payloads. Browser-only DOMPurify usage must not leave an unsanitized server-rendered `v-html` path.
9. **Correct verification wording.** The document names six Phase 1 tools but refers to five example questions; require at least one successful end-to-end check for each of the six tools.

Suggested sequencing: add a short **Task 0.5 — Tool authorization and transport contract** after Task 0. It should close the points above before the registry, server, and chat route are implemented.
