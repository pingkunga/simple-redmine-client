import type { H3Event } from 'h3';
import useRedmineAPI from '~/composables/useRedmineAPI';
import { getThisWeekVersions } from './releaseService';

/**
 * Thin H3 adapter for the /api/release/* routes: resolves the Redmine URL and the
 * (possibly personal-key) headers from the request, then calls the event-agnostic service.
 */
export const getThisWeekVersionsForEvent = (event: H3Event, projectId: number) => {
  const config = useRuntimeConfig();
  const { createBaseRedmineHeader } = useRedmineAPI();
  const headers = createBaseRedmineHeader(getRequestHeaders(event)) as Record<string, string>;

  return getThisWeekVersions({ redmineUrl: config.public.redmineUrl as string, headers, projectId });
};
