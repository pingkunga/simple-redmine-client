import { assertMcpAccess } from '../utils/authGate';
import { handleMcpRequest } from '../utils/mcpServer';
import { createToolContext } from '../utils/mcpTools/context';

// Handles every method: the middleware already gates /api/mcp, but the key is checked again
// here so this route stays closed even if a path variant slips past the middleware.
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event);
  assertMcpAccess({
    authorization: getHeader(event, 'authorization'),
    xApiKey: getHeader(event, 'x-api-key'),
    expectedKey: config.mcpApiKey as string,
  });

  return handleMcpRequest(toWebRequest(event), createToolContext());
});
