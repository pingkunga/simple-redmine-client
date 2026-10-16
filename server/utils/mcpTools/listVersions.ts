import axios from 'axios';
import { z } from 'zod';
import { getSupportProjects } from '../projectConfig';
import { MAX_RESULTS, TOOL_TIMEOUT_MS, type McpToolDef, type ToolContext } from './types';

const inputSchema = {
  projectId: z.number().int().positive().optional()
    .describe('Redmine project id. If omitted, the configured default projects are searched.'),
  status: z.enum(['open', 'locked', 'closed']).optional()
    .describe('Only versions with this status'),
  name: z.string().max(64).optional()
    .describe('Case-insensitive substring of the version name, e.g. "8.9.15.4"'),
  limit: z.number().int().min(1).max(MAX_RESULTS).optional()
    .describe(`Max versions to return (default 100, max ${MAX_RESULTS})`),
};
const schema = z.object(inputSchema);

export const listVersions = async (rawArgs: unknown, ctx: ToolContext) => {
  const { projectId, status, name, limit = 100 } = schema.parse(rawArgs ?? {});

  // Default scope is a convenience taken from SupportProject.json, not a security boundary.
  const projectIds = projectId ? [projectId] : getSupportProjects().map(p => p.id);
  if (projectIds.length === 0) {
    throw new Error('projectId is required: no default project list is configured');
  }

  const settled = await Promise.allSettled(
    projectIds.map(id =>
      axios.get<VersionsResponse>(`${ctx.redmineUrl}/projects/${id}/versions.json`, {
        headers: ctx.headers,
        timeout: TOOL_TIMEOUT_MS,
      })
    )
  );

  const failedScopes: string[] = [];
  const byId = new Map<number, RawVersion>();
  settled.forEach((result, i) => {
    if (result.status === 'rejected') {
      failedScopes.push(String(projectIds[i]));
      return;
    }
    for (const v of result.value.data.versions) byId.set(v.id, v);
  });

  if (failedScopes.length === projectIds.length) {
    throw new Error(`Failed to fetch versions for project(s): ${failedScopes.join(', ')}`);
  }

  const needle = name?.toLowerCase();
  const matched = [...byId.values()].filter(v =>
    (!status || v.status === status) && (!needle || v.name.toLowerCase().includes(needle))
  );

  return {
    count: Math.min(matched.length, limit),
    truncated: matched.length > limit,
    partial: failedScopes.length > 0,
    failedScopes,
    versions: matched.slice(0, limit).map(v => ({
      id: v.id,
      name: v.name,
      projectId: v.project?.id,
      projectName: v.project?.name,
      status: v.status,
      dueDate: v.due_date,
    })),
  };
};

export const listVersionsTool: McpToolDef = {
  name: 'list_versions',
  description:
    'List Redmine versions (releases). Filter by projectId, status and/or name substring. ' +
    'Use this FIRST to turn a version name like "8.9.15.4" into its numeric id before calling get_issues_by_version. ' +
    'If "partial" is true, some projects could not be read (see failedScopes) and the list is incomplete.',
  inputSchema,
  handler: listVersions,
};
