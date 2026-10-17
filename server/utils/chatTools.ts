import { createMCPClient, type MCPTransport } from '@ai-sdk/mcp';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createMcpServer } from './mcpServer';
import type { McpToolDef, ToolContext } from './mcpTools/types';

/**
 * Connects an MCP client to this app's own MCP server over a linked in-memory transport (no HTTP
 * hop, no key needed: only the chat route can reach this pair) and returns the tools in `ai` SDK
 * form plus a `close()` that must always be called.
 */
export const connectChatTools = async (ctx: ToolContext, toolDefs?: McpToolDef[]) => {
  const server = createMcpServer(ctx, toolDefs);
  const [serverSide, clientSide] = InMemoryTransport.createLinkedPair();
  await server.connect(serverSide);

  const client = await createMCPClient({ transport: clientSide as unknown as MCPTransport });
  const tools = await client.tools();

  return {
    tools,
    close: async () => {
      await client.close().catch(() => {});
      await server.close().catch(() => {});
    },
  };
};

export type ChatToolSession = Awaited<ReturnType<typeof connectChatTools>>;
