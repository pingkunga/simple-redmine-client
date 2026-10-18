import { z } from 'zod';
import { DEFAULT_RELEASE_PROJECT_ID, getThisWeekVersions } from '../releaseService';
import { TOOL_TIMEOUT_MS, withTimeout, type McpToolDef, type ToolContext } from './types';

const inputSchema = {
  projectId: z.number().int().positive().optional()
    .describe(`Redmine project id. Omit it to use the default project (Investment .NET, ${DEFAULT_RELEASE_PROJECT_ID})`),
};
const schema = z.object(inputSchema);

export const getThisWeekReleases = async (rawArgs: unknown, ctx: ToolContext) => {
  const projectId = schema.parse(rawArgs).projectId ?? DEFAULT_RELEASE_PROJECT_ID;

  const versions = await withTimeout(
    getThisWeekVersions({ redmineUrl: ctx.redmineUrl, headers: ctx.headers, projectId }),
    TOOL_TIMEOUT_MS,
    `Releases for project ${projectId}`,
  );

  return {
    projectId,
    note: 'Versions due in the next 7 days whose due date is a Sunday (released the preceding Friday); dates follow the server timezone.',
    count: versions.length,
    releases: versions.map(v => ({
      id: v.id,
      name: v.name,
      dueDate: v.due_date,
      workingDay: v.versionDueDateWorkingDayText,
      ownerTeam: v.ownerTeam,
      releaseBranch: v.currentReleaseBranch,
      buildSeries: v.currentBuildSeries,
      isCustomerBuild: !!v.buildFor,
      nextVersion: v.nextWeekReleaseVersion,
    })),
  };
};

export const getThisWeekReleasesTool: McpToolDef = {
  name: 'get_thisweek_releases',
  description:
    'List the versions scheduled to release in the next 7 days for a project: name, due date, the working day it ' +
    'ships (the preceding Friday), owning team, release branch, whether it is a customer (production) build, and ' +
    `the next version number. projectId is optional: omit it for the default project (Investment .NET, ${DEFAULT_RELEASE_PROJECT_ID}). ` +
    'Call it once; do NOT call it once per project from list_projects.',
  inputSchema,
  handler: getThisWeekReleases,
};
