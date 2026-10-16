# AI Integration Spec — Chat page + MCP tool layer

Status: **Phase 1 approved, not yet implemented.** This document is the implementation spec; each task below is independently completable and checkpointed before moving to the next.

## Requirements (consolidated)

**Functional**
- Add a Chat page (`/chat`) to the app where a user asks natural-language questions about live Redmine/GitLab data.
- Expose the app's data-fetching logic as **real MCP protocol tools** (not just internal function calls) — usable both by the in-app Chat page and by external MCP clients (Claude Desktop, Claude Code, other agents).
- Phase 1 is **read-only**: `list_versions` (+ name-substring filter, since neither Redmine nor `/api/versions` filters by name), `get_issues_by_version` (chained after `list_versions` to resolve a version *name* like `8.9.15.4` to its numeric id — Redmine has no name filter for issues), `get_issue_graph`, `list_projects`, `list_gitlab_branches`, `get_thisweek_releases`.
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
- Every tool touching a `projectId`/`trackerId` must validate against the existing `public/Config/SupportProject.json`/`SupportTracker.json` allowlist, **fail-closed** (empty/unreadable config → reject, never "anything goes").
- `/api/chat` and `/api/mcp/*` each need their own auth gate — the app has almost no auth today outside `/admin` and `/api/release/*`, and each caller type (in-app page vs. external MCP client) needs a scheme it can actually satisfy.
- Per-user Redmine identity (forwarding a user's personal API key instead of the shared server token) is explicitly **deferred to Phase 3**, with the Phase-1 shared-token exposure trade-off called out for human sign-off before shipping — not silently accepted.
- Vitest coverage per existing repo convention (tests alongside the code, `environment: 'nuxt'`) for every new tool handler, the provider factory, and the chat route.

Full detail for each of these is in the sections below.

## Implementation Tasks

Tasks 0–6 are the Phase-1 (read-only) deliverable; Tasks 7–8 are verification spikes required before calling Phase 1 done; Task 9 is explicitly **not built now** — listed so scope stays visible.

**Task 0 — Prerequisite refactor + guardrails**
- Refactor `server/utils/releaseService.ts`'s `getThisWeekVersions(event, projectId)` to the event-agnostic shape used by `server/utils/issueGraph.ts` (`fetchIssueGraph({ redmineUrl, headers, ... })`) — plain args, no H3 `event`. Update the existing `/api/release/*` callers to pass extracted args.
- Add `assertProjectSupported(projectId)` and `getSupportTrackers()`/`assertTrackerSupported(trackerId)` to `server/utils/projectConfig.ts`, **fail-closed**: throw when the allowlist is empty/unreadable or the id isn't in it.
- ✅ **Checkpoint**: existing `/api/release/*` routes still pass their current tests unchanged in behavior; new Vitest cases for the assert helpers cover (a) valid id passes, (b) invalid id throws, (c) empty/unreadable config throws (not silently passes).

**Task 1 — MCP tool registry (the 6 read-only tools)**
- Implement `server/utils/mcpTools/{listVersions,getIssuesByVersion,getIssueGraph,listProjects,listGitlabBranches,getThisWeekReleases}.ts`, each a pure handler with a zod input schema, wrapping the logic already cataloged in "Phase 1 tools" below (reusing `issueGraph.ts`, `gitlabCache.ts`, refactored `releaseService.ts` directly rather than re-implementing).
- `list_versions` gets the optional `name` substring filter (applied post-fetch). `get_issues_by_version` takes numeric `versionId` only; its tool description must instruct the model to resolve a version *name* via `list_versions` first.
- `server/utils/mcpTools/registry.ts` exports `{name, description, inputSchema, handler}[]` for all six.
- ✅ **Checkpoint**: one `*.test.ts` per handler (repo convention: alongside the code) covering happy path + allowlist-rejection path; `bun x vitest server/utils/mcpTools` green.

**Task 2 — Real MCP server**
- Build the `McpServer` (`@modelcontextprotocol/sdk`) from the registry (`server.tool(...)` per entry).
- Expose it two ways: (a) linked in-memory transport pair for the in-app chat route (Task 5) — no HTTP hop; (b) Streamable HTTP transport at `server/api/mcp/[transport].ts` for external clients.
- ✅ **Checkpoint**: a smoke test asserts all 6 tools register with valid schemas; manually connecting `mcp-inspector` (or equivalent) to the HTTP endpoint lists all 6 tools with correct descriptions/schemas.

**Task 3 — Auth gates for the new routes**
- Extend `server/middleware/auth.ts`: `/api/chat` reuses the existing `/api/release/*` multi-mode gate; `/api/mcp/*` gets its own bearer/`x-api-key` scheme checked against a new `runtimeConfig.mcpApiKey` (distinct from `automationApiKey`).
- ✅ **Checkpoint**: automated test hits both routes with no credentials (expect 401/403) and with valid credentials (expect pass-through); manual check that `config.public.internalApiKey` is documented as not-a-real-secret in code comments, not just this doc.

**Task 4 — Multi-provider LLM abstraction**
- `server/utils/llmProvider.ts`: factory reading `runtimeConfig.llmProvider` (`anthropic|google|openai|azure|ollama|lmstudio`) + per-provider keys, returns an `ai`-SDK `LanguageModel`. Add adapter packages (`@ai-sdk/anthropic`, `@ai-sdk/google`, `@ai-sdk/openai`, `@ai-sdk/azure`) and the `runtimeConfig` keys listed under "LLM provider abstraction" below.
- Factory throws a clear startup error if the configured provider's required keys are missing.
- ✅ **Checkpoint**: unit test per provider branch (6 cases) asserting correct adapter call + config mapping, plus a missing-required-key case that throws (not a silent runtime failure on first chat message).

**Task 5 — Chat route**
- `server/api/chat.post.ts`: connects as an MCP client over the Task 2 in-memory transport, converts the tool list for `streamText({ model, tools, messages })` (model from Task 4's factory), streams the response back.
- ✅ **Checkpoint**: route-level test mocking the provider adapter and MCP client asserts the tool-calling loop (model requests tool → route executes via MCP client → result fed back → final answer) and the streaming response shape.

**Task 6 — Chat page & UI**
- `app/pages/chat.vue`: Nuxt UI `UChatMessages`/`UChatPrompt`/`UChatPromptSubmit` + `useChat` pointed at `/api/chat`. **Before installing**, verify from `node_modules` which `ai` major `@nuxt/ui@4.4.0` expects and whether `useChat` ships from `ai` or `@ai-sdk/vue` in that major.
- Add a sanitized Markdown renderer (`markdown-it` + `DOMPurify`) for message content.
- Add the nav entry in `app/components/sidebar/sidebarItems.ts`.
- ✅ **Checkpoint**: `bun run dev`, open `/chat`, ask each of the 5 example questions from "What Phase 1 actually lets someone ask" below, confirm correct tool selection and rendered (sanitized) markdown output; confirm an out-of-allowlist project/tracker id is refused with a visible error, not silently dropped.

**Task 7 — Local-provider spike (Ollama / LM Studio)**
- Run one real end-to-end tool call against the intended local model via `createOpenAI({ baseURL })`.
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
| "สรุป issue ทั้งหมดใน version 8.9.15.4 ให้หน่อย" | `list_versions` (resolve name → id) then `get_issues_by_version` — see the two-step chain note below |
| "project ไหนบ้างที่ทีมดูแลอยู่" | `list_projects` |

Everything above is read/summarize only — no create/update/delete capability exists in Phase 1. "ช่วยร่าง build request ให้ version นี้" and similar write requests are explicitly Phase 2, gated behind a confirmation step, not part of this spec's deliverable.

## Architecture

**One tool registry, two protocol-correct consumers — both real MCP, not a shortcut.**

The chat route becomes an **MCP client** that talks to this app's own **MCP server**, and the `ai` SDK's native MCP-client support (`experimental_createMCPClient` / equivalent in the installed `ai` version) is used to turn the MCP server's tool list directly into `ai` SDK tool definitions for `streamText({ tools })`. This gets "real protocol" and "chat page" from the same source of truth with no duplicate tool-calling logic.

```
server/utils/mcpTools/*.ts     ← pure, event-agnostic tool handlers (zod input schema + handler),
                                   one file per tool, *.test.ts alongside (repo convention)
server/utils/mcpTools/registry.ts  ← exports the list of {name, description, inputSchema, handler}

server/api/mcp/[transport].ts  ← the same McpServer instance, also exposed over Streamable HTTP
                                   transport for *external* MCP clients (Claude Desktop, etc.) — this
                                   route is only for those external clients; the in-app chat page never
                                   calls it (see the in-memory transport note below)

server/api/chat.post.ts        ← MCP *client* connected via the MCP SDK's **linked in-memory transport**
                                   to the same McpServer instance (real MCP protocol, zero HTTP hop, no
                                   self-request through the new auth gate) + ai SDK streamText(),
                                   provider adapter swappable, streams the response back to the browser

app/pages/chat.vue             ← Nuxt UI UChatMessages/UChatPrompt + ai SDK's useChat composable
```

Why this shape and not the alternatives considered:
- A standalone MCP server package (separate process calling this app's HTTP routes, or importing `server/utils` as a shared lib) was rejected — this app has never had a second deployable, and it would double the already-open auth surface for no real benefit at this scale.
- Building the registry as plain internal functions with no protocol (the "internal tool-calling" option) was rejected — real MCP is a requirement from day one.

## LLM provider abstraction

`server/utils/llmProvider.ts` — a single factory (e.g. `getLanguageModel()`) that reads `runtimeConfig.llmProvider` (one of `anthropic | google | openai | azure | ollama | lmstudio`) plus that provider's own config keys, and returns an `ai`-SDK `LanguageModel` instance. `server/api/chat.post.ts` calls this factory once and never branches on provider itself — `streamText({ model, tools, messages })` is identical regardless of which provider is configured.

Adapter packages needed (the `ai` SDK's whole point is a uniform `LanguageModel` interface across these):
- `@ai-sdk/anthropic` — Claude.
- `@ai-sdk/google` — Gemini.
- `@ai-sdk/openai` — OpenAI, and reused (via `createOpenAI({ baseURL })`) for **Ollama** and **LM Studio**, since both expose an OpenAI-compatible chat-completions endpoint — no separate adapter package needed for those two, just a different `baseURL` and typically no API key.
- `@ai-sdk/azure` — Azure OpenAI, kept separate from `@ai-sdk/openai` because Azure's auth shape differs (resource name + deployment name + API version, not a plain API key + model string).

`nuxt.config.ts` `runtimeConfig` additions: `llmProvider`, `llmModel`, and per-provider secrets/endpoints as needed — `anthropicApiKey`, `googleApiKey`, `openaiApiKey`, `azureApiKey`/`azureResourceName`/`azureDeployment`, `ollamaBaseUrl`, `lmstudioBaseUrl` — all following the existing `smtpPass`/`gitlabToken` pattern (private config, `.env`-sourced, never hardcoded). Only the configured provider's keys need to be set; the factory should throw a clear startup-time error if `llmProvider` is set to something whose required keys are missing, rather than failing opaquely on first chat request.

Note for Ollama/LM Studio: these typically run on `localhost` or a LAN machine, not a cloud endpoint — the Nitro server process needs actual network reachability to wherever that server runs; this is a deployment-environment detail to confirm before relying on either as the configured provider, not a code change.

**Spike before committing to all six providers**: this whole feature is built around tool-calling — a provider that can't emit tool calls makes the chat page a plain chatbot with none of the six tools working. Ollama and LM Studio's OpenAI-compatible endpoints have tool-call support that varies by which model is actually loaded, unlike the cloud providers where it's guaranteed. Before Phase 1 is considered done, run one real end-to-end tool-call through whichever local model is the intended target via `createOpenAI({ baseURL })`, and confirm it works. If it doesn't, `@ai-sdk/openai` is the wrong adapter for that target and a dedicated community provider package (or dropping that provider from the supported list) is needed — this is flagged as the one item most likely to change scope after the fact, so it should be resolved early, not assumed.

## Prerequisite refactor

`server/utils/releaseService.ts`'s `getThisWeekVersions(event, projectId)` currently takes an H3 `event` and resolves headers via Nuxt-auto-imported `useRedmineAPI()` — not event-agnostic, can't be a clean tool handler as-is. Refactor it to the same shape already used by `server/utils/issueGraph.ts`'s `fetchIssueGraph({ redmineUrl, headers, ... })`: plain args in, no H3 event. Do this once, shared by both the existing `/api/release/*` routes (which keep working, just pass the extracted args) and the new `get_thisweek_releases` tool.

## Guardrails (fail-closed, matching existing config pattern)

`server/utils/projectConfig.ts`'s `getSupportProjects()` returns `[]` on any read error (missing file, bad JSON, wrong `cwd` under a built Nitro output) — a guardrail that says "if the allowlist is empty, skip the check" would silently disable itself in exactly the failure mode that matters. Add an explicit assertion helper (e.g. `assertProjectSupported(projectId)`, and a matching `getSupportTrackers()`/`assertTrackerSupported(trackerId)` reading `public/Config/SupportTracker.json` the same way) that **throws when the allowlist is empty or the id isn't in it** — never treats "can't read config" as "anything goes." Every tool handler that takes a `projectId`/`trackerId` calls this before touching Redmine.

## Phase 1 tools (read-only only, per the locked-in decision)

| Tool | Wraps | Notes |
|---|---|---|
| `list_versions` | `GET /api/versions` logic | filter by project/status, scoped via `assertProjectSupported`. Adds an optional `name` (substring) filter applied **in the tool handler after fetching**, since neither the underlying Redmine API nor `/api/versions` supports filtering by version name — this keeps the token cost of "find version 8.9.15.4" down without changing the HTTP route's contract. |
| `get_issues_by_version` | `GET /api/issues/issue-version` logic | Takes a numeric `versionId` only — Redmine's issues API has no name-based filter. Users naturally refer to a version by **name** (e.g. "8.9.15.4"), so the tool description must make explicit that the model should call `list_versions` (with the `name` filter above) first to resolve name → id, then call this tool with that id — a two-step tool chain, not a 1:1 mapping from question to tool. |
| `get_issue_graph` | `server/utils/issueGraph.ts` (`fetchIssueGraph`) | already event-agnostic + tested — template for the others |
| `list_projects` | `GET /api/projects`, `.../support` logic | |
| `list_gitlab_branches` | `server/utils/gitlabCache.ts` (`getGitLabBranches`) | |
| `get_thisweek_releases` | `server/utils/releaseService.ts` (after refactor above) | |

Explicitly **out of scope for any phase**, not just deferred (irreversible/high-blast-radius, existing manual UX already covers them): `POST /api/release/auto-create-build-inv`, `POST /api/release/send-release-mail`, `DELETE /api/versions/[id]`. Other write endpoints (`create_devtracker_issue`, `create_buildinvset_issue`, `create_buildnetcommon_issue`, version create/update) are real Phase 2 candidates but not built now.

## Auth for the new routes

Two different callers need two different gates:

- **`/api/chat`** (called only by this app's own `chat.vue` page): reuse the existing `/api/release/*` multi-mode gate (session cookie, SSR/no-client-IP, or `x-internal-key` header) via `server/middleware/auth.ts`. Note `config.public.internalApiKey` ships to the browser bundle (not a real secret) — it blocks casual direct hits but isn't a hard boundary; call this out plainly rather than overstating the protection.
- **`/api/mcp/*`** (called by external MCP clients — Claude Desktop, Claude Code, another agent — which is the whole reason this spec builds a real protocol server instead of internal-only tool-calling): those clients cannot send a session cookie and won't be on the `automationAllowedIps` list. Needs its own scheme those clients can actually configure: a **bearer token / `x-api-key` header** checked against a new dedicated config value (e.g. `mcpApiKey`, distinct from `automationApiKey` so MCP access can be revoked independently of Jenkins automation), issued to whoever is allowed to connect an external client. Add this as its own branch in `server/middleware/auth.ts`, not a reuse of the `/api/release/*` rule set.

## Frontend

- `app/pages/chat.vue` — new page, rendered through the existing `app/layouts/default.vue` automatically. Uses Nuxt UI's `UChatMessages`/`UChatPrompt`/`UChatPromptSubmit` plus a `useChat` composable pointed at `/api/chat` (this pairing is why `ai` is required, not optional, once Nuxt UI's chat components are the chosen UI). **Verify from `node_modules` before installing, not from memory**: confirm which `ai` major version `@nuxt/ui@4.4.0` actually expects (its own `devDependencies` pin `ai@^6.0.42`) and whether `useChat` still ships from `ai` itself or has moved to a separate `@ai-sdk/vue` package in that major — install whichever combination actually matches, since a mismatch breaks `UChatMessage`'s `UIMessage`/`parts[]` typing.
- `app/components/sidebar/sidebarItems.ts` — add a one-line `{ title: "Chat", icon: ..., to: "/chat" }` entry.
- Markdown rendering: no renderer exists in this app today (Tiptap is edit-only). Add a small renderer (`markdown-it` + `DOMPurify`, sanitizing before `v-html`) since LLM output — and tool results echoing Redmine free text — must not be trusted as safe HTML. This is the lightest addition consistent with this app's existing small-utility dependencies (`file-saver`, `xlsx`); revisit if Nuxt UI's `Prose*`/`@nuxtjs/mdc` path is preferred later.

## New dependencies

- `@modelcontextprotocol/sdk` (server) — MCP server + client.
- `ai` (server + client `useChat`) + provider adapters: `@ai-sdk/anthropic`, `@ai-sdk/google`, `@ai-sdk/openai` (also covers Ollama/LM Studio via `baseURL`), `@ai-sdk/azure`.
- `markdown-it` + `dompurify` (+ `@types/dompurify` if needed) — chat message rendering.
- `nuxt.config.ts` `runtimeConfig`: `llmProvider`, `llmModel`, and per-provider secrets/endpoints as listed in "LLM provider abstraction" above — never hardcoded, `.env`-sourced like the existing `smtpPass`/`gitlabToken` keys.

## Testing (Vitest, `environment: 'nuxt'`, tests alongside code per repo convention)

- One `*.test.ts` per tool handler in `server/utils/mcpTools/` — mock the underlying util, assert both the happy path and the allowlist-rejection path (empty/unreadable config → reject, not pass through).
- Test for `releaseService`'s refactored signature (update/extend existing test if present, else add one matching `issueGraph.test.ts`'s style).
- Route-level test for `server/api/chat.post.ts` mocking the provider adapter and the MCP client, asserting the tool-calling loop and streaming shape.
- Test for `llmProvider.ts`'s factory: each of the six `llmProvider` values resolves to the right adapter call with the right config keys, and an unset/incomplete required key throws a clear error rather than failing silently on first request.
- Smoke-test the MCP server route registers all Phase 1 tools with valid schemas.

## Verification

- `bun test` (full suite) and targeted `bun x vitest server/utils/mcpTools` / `bun x vitest server/api/chat.post.test.ts` runs green.
- `bun run dev`, log in as needed, open `/chat`, ask a question that requires each Phase 1 tool at least once (e.g. "what versions are due this week for project X", "show me branches for GitLab project Y", "graph the relations around issue Z") and confirm correct tool selection, correct data, and that an out-of-allowlist project/tracker id is refused rather than silently allowed.
- Confirm `/api/chat` is reachable only per its gate (session/SSR/`x-internal-key`) and `/api/mcp/*` only with a valid `mcpApiKey` bearer token — an unauthorized direct hit to either should 401/403.
- Manually connect an external MCP client (e.g. Claude Desktop's MCP config with the bearer token, or `mcp-inspector`) to `/api/mcp/*` and confirm the same six tools list and execute correctly outside the chat page, since "real external-client-usable MCP" was the explicit goal.
- Run the Ollama/LM Studio tool-calling spike (see "LLM provider abstraction") and record the result before calling Phase 1 done.

## Open item carried forward (not blocking Phase 1 architecture)

Per-user Redmine identity: chat/MCP tool calls run under the shared server `redmineToken` in Phase 1 (the personal-key header `x-my-redmine-api-key` has no path into a server-initiated call). This means every chat user sees whatever the shared token can see in Redmine — flagged for explicit human sign-off before Phase 1 ships to production, not silently assumed acceptable. Forwarding a logged-in user's personal key is real Phase 3 work.

## Review follow-up — resolve before implementation

The Phase 1 direction remains approved, but the following implementation contracts must be decided and documented before Task 1 begins:

1. **Enforce authorization from resource ownership, not only tool input.** A caller can supply a numeric `versionId` or `issueId` without ever calling `list_versions`. `get_issues_by_version` must resolve the version's owning Redmine project and reject it unless that project is supported. `get_issue_graph` must validate the root issue's project and must never return a node or relation from an unsupported project; choose and test either truncation with an explicit reason or complete rejection when traversal crosses the allowlist boundary.
2. **Use a real authentication boundary for `/api/chat`.** Do not treat a missing client IP as proof of SSR, and do not rely on `config.public.internalApiKey`: public runtime config is visible to browsers and is not a secret. Define `/api/chat` as session-authenticated (with the appropriate same-origin/CSRF protection), and reserve any server-to-server access for a private, separately configured credential if it is truly needed.
3. **Specify the external MCP HTTP contract.** Replace the placeholder `[transport]` route description with the selected Streamable HTTP endpoint shape, supported HTTP methods, session identifier/transport ownership, concurrent-client behavior, and disconnect cleanup. Do not assume one shared `McpServer`/transport instance can safely serve all requests without a lifecycle design.
4. **Scope `list_projects` and GitLab branches to allowlists.** `list_projects` must return only configured supported projects (or their intersection with currently accessible Redmine projects), not every project returned by Redmine. `list_gitlab_branches` must validate its GitLab project ID against `SupportGitLabProject.json` with a fail-closed helper matching the Redmine project/tracker helpers.
5. **Define bounded schemas and failure semantics for every tool.** Each tool needs typed input/output contracts, pagination or result limits, maximum string length, timeout, and a policy for upstream partial failure. Results must either report `partial`/failed scopes explicitly or fail; they must not silently appear complete after a Redmine/GitLab fetch fails.
6. **Define release-date semantics and inject time for tests.** The existing release utility selects Sunday due dates while rendering the preceding Friday as the working day. State the intended meaning of “this week” and its timezone, include it in tool output, and pass a clock/`now` dependency into the refactored utility for deterministic tests.
7. **Treat tool results as untrusted data.** Redmine descriptions, issue subjects, and branch names can contain prompt-injection text. The chat system instructions must treat tool output as data rather than instructions. Add bounded tool rounds, request/message-size limits, cancellation, timeouts, rate limiting, and audit logs that exclude secrets and sensitive prompt/tool payloads.
8. **Make Markdown sanitization server/client-safe.** Document where sanitization runs under Nitro SSR and add XSS tests for unsafe HTML, URL schemes, and SVG/event-handler payloads. Browser-only DOMPurify usage must not leave an unsanitized server-rendered `v-html` path.
9. **Correct verification wording.** The document names six Phase 1 tools but refers to five example questions; require at least one successful end-to-end check for each of the six tools.

Suggested sequencing: add a short **Task 0.5 — Tool authorization and transport contract** after Task 0. It should close the points above before the registry, server, and chat route are implemented.
