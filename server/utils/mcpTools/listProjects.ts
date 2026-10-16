import axios from 'axios';
import { z } from 'zod';
import { MAX_RESULTS, TOOL_TIMEOUT_MS, type McpToolDef, type ToolContext } from './types';

const PAGE_SIZE = 100;
const MAX_PAGES = 10;

const inputSchema = {
  nameContains: z.string().max(64).optional()
    .describe('Case-insensitive substring of the project name or identifier'),
  limit: z.number().int().min(1).max(MAX_RESULTS).optional()
    .describe(`Max projects to return (default 100, max ${MAX_RESULTS})`),
};
const schema = z.object(inputSchema);

export const listProjects = async (rawArgs: unknown, ctx: ToolContext) => {
  const { nameContains, limit = 100 } = schema.parse(rawArgs ?? {});

  const all: { id: number; name: string; identifier: string }[] = [];
  let total = 0;

  for (let page = 0; page < MAX_PAGES; page++) {
    const response = await axios.get<ProjectsResponse>(`${ctx.redmineUrl}/projects.json`, {
      headers: ctx.headers,
      params: { offset: page * PAGE_SIZE, limit: PAGE_SIZE },
      timeout: TOOL_TIMEOUT_MS,
    });
    total = response.data.total_count;
    all.push(...response.data.projects.map(p => ({ id: p.id, name: p.name, identifier: p.identifier })));
    if (all.length >= total || response.data.projects.length === 0) break;
  }

  if (total === 0) {
    throw new Error('Redmine returned no projects; check the token permissions');
  }

  const needle = nameContains?.toLowerCase();
  const matched = needle
    ? all.filter(p => p.name.toLowerCase().includes(needle) || p.identifier.toLowerCase().includes(needle))
    : all;

  return {
    total,
    count: Math.min(matched.length, limit),
    // true when the listing was cut by `limit` or by the page ceiling
    truncated: matched.length > limit || all.length < total,
    projects: matched.slice(0, limit),
  };
};

export const listProjectsTool: McpToolDef = {
  name: 'list_projects',
  description:
    'List Redmine projects visible to the server (id, name, identifier). ' +
    'Use nameContains to find a project, then pass its id to other tools.',
  inputSchema,
  handler: listProjects,
};
