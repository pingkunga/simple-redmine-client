import type { z } from 'zod';

/** Everything a tool needs from the outside world; no H3 event, so tools stay unit-testable. */
export interface ToolContext {
  redmineUrl: string;
  headers: Record<string, string>;
}

/**
 * A read-only tool. `inputSchema` is a zod raw shape (what the MCP SDK registers); `handler`
 * validates its own input, so calling it directly is as safe as calling it through MCP.
 * Handlers throw on failure; the MCP layer turns that into an error result.
 */
export interface McpToolDef {
  name: string;
  description: string;
  inputSchema: Record<string, z.ZodType>;
  handler: (args: unknown, ctx: ToolContext) => Promise<unknown>;
}

/** Per-request upstream timeout (ms) for every Redmine/GitLab call a tool makes. */
export const TOOL_TIMEOUT_MS = 10_000;

/** Hard ceiling on items returned by any list-style tool. */
export const MAX_RESULTS = 200;
