import type { ToolContext } from './types';

/**
 * Builds the context tools run with. Phase 1 uses the shared server `redmineToken`
 * (the personal-key header has no path into a server-initiated call).
 */
export const createToolContext = (): ToolContext => {
  const config = useRuntimeConfig();
  return {
    redmineUrl: config.public.redmineUrl as string,
    headers: {
      'Content-Type': 'application/json',
      'X-Redmine-API-Key': config.redmineToken as string,
    },
  };
};
