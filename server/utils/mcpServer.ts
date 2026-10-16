import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { mcpTools } from './mcpTools/registry';
import type { McpToolDef, ToolContext } from './mcpTools/types';

const errorMessage = (e: unknown) => (e instanceof Error ? e.message : String(e));

/**
 * Builds an MCP server exposing `tools`. A failing handler becomes an `isError` tool result
 * (so the model can read it and recover) instead of a protocol error. Only the message is
 * returned, never the error object, so upstream response bodies/headers are not echoed.
 */
export const createMcpServer = (ctx: ToolContext, tools: McpToolDef[] = mcpTools): McpServer => {
  const server = new McpServer({ name: 'redmine-client', version: '1.0.0' });

  for (const tool of tools) {
    server.registerTool(
      tool.name,
      { description: tool.description, inputSchema: tool.inputSchema },
      async (args: unknown) => {
        try {
          const result = await tool.handler(args, ctx);
          return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
        } catch (e) {
          return { isError: true, content: [{ type: 'text' as const, text: `Error: ${errorMessage(e)}` }] };
        }
      },
    );
  }

  return server;
};

const methodNotAllowed = () =>
  new Response(
    JSON.stringify({ jsonrpc: '2.0', error: { code: -32000, message: 'Method not allowed. Use POST.' }, id: null }),
    { status: 405, headers: { 'Content-Type': 'application/json', Allow: 'POST' } },
  );

/**
 * Stateless Streamable HTTP: every POST gets its own server and transport, nothing is kept
 * between requests (no session id, no SSE stream to leak). GET/DELETE are meaningless
 * without sessions, so they answer 405. Access control is the caller's job.
 */
export const handleMcpRequest = async (request: Request, ctx: ToolContext): Promise<Response> => {
  if (request.method !== 'POST') return methodNotAllowed();

  const server = createMcpServer(ctx);
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  try {
    await server.connect(transport);
    return await transport.handleRequest(request);
  } finally {
    // The JSON response is fully built before handleRequest resolves, so closing here is safe.
    await transport.close().catch(() => {});
    await server.close().catch(() => {});
  }
};
