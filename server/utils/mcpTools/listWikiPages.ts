import axios from 'axios';
import { z } from 'zod';
import { MAX_RESULTS, TOOL_TIMEOUT_MS, type McpToolDef, type ToolContext } from './types';

const DEFAULT_LIMIT = 100;

interface RawWikiPage {
  title: string;
  parent?: { title: string };
  version: number;
  created_on: string;
  updated_on: string;
}

const inputSchema = {
  projectId: z.union([z.number().int().positive(), z.string().min(1).max(100)])
    .describe('Redmine project id or identifier'),
  titleContains: z.string().max(64).optional()
    .describe('Case-insensitive substring of the page title'),
  limit: z.number().int().min(1).max(MAX_RESULTS).optional()
    .describe(`Max pages to return (default ${DEFAULT_LIMIT}, max ${MAX_RESULTS})`),
};
const schema = z.object(inputSchema);

export const listWikiPages = async (rawArgs: unknown, ctx: ToolContext) => {
  const { projectId, titleContains, limit = DEFAULT_LIMIT } = schema.parse(rawArgs);

  const response = await axios.get<{ wiki_pages: RawWikiPage[] }>(
    `${ctx.redmineUrl}/projects/${encodeURIComponent(String(projectId))}/wiki/index.json`,
    { headers: ctx.headers, timeout: TOOL_TIMEOUT_MS },
  ).catch((error) => {
    if (axios.isAxiosError?.(error) && error.response?.status === 404) {
      throw new Error(`Project ${projectId} not found or it has no wiki`);
    }
    throw error;
  });

  const needle = titleContains?.toLowerCase();
  const matched = response.data.wiki_pages.filter(p => !needle || p.title.toLowerCase().includes(needle));
  const pages = matched.slice(0, limit).map(p => ({
    title: p.title,
    parent: p.parent?.title,
    version: p.version,
    createdOn: p.created_on,
    updatedOn: p.updated_on,
  }));

  return { total: matched.length, count: pages.length, truncated: matched.length > limit, pages };
};

export const listWikiPagesTool: McpToolDef = {
  name: 'list_wiki_pages',
  description: 'List the wiki pages of one Redmine project (title, parent page, version, dates). ' +
    'Use titleContains to find a page, then read it with get_wiki_page using the exact title.',
  inputSchema,
  handler: listWikiPages,
};
