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

/**
 * Rejects if `promise` takes longer than `ms`. The underlying work is NOT cancelled; this only
 * stops the tool from waiting forever on helpers that have no timeout of their own.
 */
export const withTimeout = async <T>(promise: Promise<T>, ms: number, label: string): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms} ms`)), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
};
