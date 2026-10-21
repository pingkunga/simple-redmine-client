import useRedmineAPI from '../../../app/composables/useRedmineAPI';
import type { ToolContext } from './types';

/**
 * Builds the context tools run with. By default tools use the shared server `redmineToken`.
 * A caller that holds the user's own (base64) access key can pass it as `customHeader`
 * (`x-my-redmine-api-key`), as the DevTracker page does; `createBaseRedmineHeader` decodes it.
 * The caller must make sure the key is valid base64 first (`atob` throws otherwise).
 */
export const createToolContext = (customHeader?: Record<string, string | string[] | undefined>): ToolContext => {
  const config = useRuntimeConfig();
  const { createBaseRedmineHeader } = useRedmineAPI();
  return {
    redmineUrl: config.public.redmineUrl as string,
    headers: createBaseRedmineHeader(customHeader) as Record<string, string>,
  };
};
