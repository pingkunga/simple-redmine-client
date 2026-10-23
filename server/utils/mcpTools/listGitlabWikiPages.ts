import { z } from 'zod';
import { gitlabGet, projectInput, projectRef } from './gitlabApi';
import { MAX_RESULTS, type McpToolDef } from './types';

const DEFAULT_LIMIT = 100;

interface GitLabWikiRow {
  slug: string;
  title: string;
  format?: string;
}

const inputSchema = {
  ...projectInput,
  titleContains: z.string().max(64).optional()
    .describe('Case-insensitive substring of the page title or slug'),
  limit: z.number().int().min(1).max(MAX_RESULTS).optional()
    .describe(`Max pages to return (default ${DEFAULT_LIMIT}, max ${MAX_RESULTS})`),
};
const schema = z.object(inputSchema);

export const listGitlabWikiPages = async (rawArgs: unknown) => {
  const args = schema.parse(rawArgs);
  const limit = args.limit ?? DEFAULT_LIMIT;

  const rows = await gitlabGet<GitLabWikiRow[]>(`/projects/${projectRef(args)}/wikis`);

  const needle = args.titleContains?.toLowerCase();
  const matched = needle
    ? rows.filter(r => r.title.toLowerCase().includes(needle) || r.slug.toLowerCase().includes(needle))
    : rows;
  const pages = matched.slice(0, limit).map(r => ({ slug: r.slug, title: r.title, format: r.format }));

  return { total: matched.length, count: pages.length, truncated: matched.length > limit, pages };
};

export const listGitlabWikiPagesTool: McpToolDef = {
  name: 'list_gitlab_wiki_pages',
  description: 'List the wiki pages of one GitLab project (slug, title, format). Pass projectPath from a link ' +
    '(e.g. ".../invest/invest-service/-/wikis/..." -> "invest/invest-service"). Use titleContains to find a page, ' +
    'then read it with get_gitlab_wiki_page using its slug.',
  inputSchema,
  handler: listGitlabWikiPages,
};
