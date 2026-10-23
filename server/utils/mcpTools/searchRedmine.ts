import axios from 'axios';
import { z } from 'zod';
import { toPlainText } from './plainText';
import { MAX_RESULTS, type McpToolDef, type ToolContext } from './types';

// Redmine's search can take close to 10s on the production server, so it gets its own timeout.
const SEARCH_TIMEOUT_MS = 25_000;
const MAX_SNIPPET_CHARS = 300;
const DEFAULT_LIMIT = 25;

const SEARCH_TYPES = ['issues', 'wiki_pages', 'news', 'changesets', 'documents', 'messages', 'projects'] as const;

interface RawSearchResult {
  id: number;
  title: string;
  type: string;
  url?: string;
  description?: string;
  datetime?: string;
}

interface SearchResponse {
  results: RawSearchResult[];
  total_count: number;
  offset: number;
  limit: number;
}

/**
 * Every hit must carry a link (forum messages cannot be read through the REST API, so the link is
 * the only way to read them). Uses Redmine's own url; only issues can be rebuilt from the id, anything
 * else without a url becomes null rather than a guessed address.
 */
const resultUrl = (r: RawSearchResult, redmineUrl: string): string | null => {
  const given = r.url?.trim();
  if (given) return given.startsWith('/') ? `${redmineUrl}${given}` : given;
  return r.type.startsWith('issue') ? `${redmineUrl}/issues/${r.id}` : null;
};

const inputSchema = {
  q: z.string().min(2).max(100)
    .describe('Text to search for, e.g. a version number like "7.5.44.1" or a keyword'),
  types: z.array(z.enum(SEARCH_TYPES)).min(1).optional()
    .describe('What to search (default issues, wiki_pages and messages)'),
  titlesOnly: z.boolean().optional()
    .describe('Match titles/subjects only (default true). Set false to search the full text as well'),
  openIssuesOnly: z.boolean().optional()
    .describe('Only open issues (default false)'),
  projectId: z.number().int().positive().optional()
    .describe('Limit the search to one project id (default: all projects)'),
  limit: z.number().int().min(1).max(MAX_RESULTS).optional()
    .describe(`Max results to return (default ${DEFAULT_LIMIT}, max ${MAX_RESULTS})`),
  offset: z.number().int().min(0).optional()
    .describe('Number of results to skip, for paging (default 0)'),
};
const schema = z.object(inputSchema);

export const searchRedmine = async (rawArgs: unknown, ctx: ToolContext) => {
  const { q, types = ['issues', 'wiki_pages', 'messages'], titlesOnly = true, openIssuesOnly, projectId, limit = DEFAULT_LIMIT, offset = 0 } =
    schema.parse(rawArgs);

  const params: Record<string, string | number> = { q, offset, limit };
  if (projectId === undefined) params.scope = 'all';
  for (const type of types) params[type] = 1;
  if (titlesOnly) params.titles_only = 1;
  if (openIssuesOnly) params.open_issues = 1;

  const url = projectId === undefined
    ? `${ctx.redmineUrl}/search.json`
    : `${ctx.redmineUrl}/projects/${projectId}/search.json`;

  const response = await axios.get<SearchResponse>(url, { headers: ctx.headers, params, timeout: SEARCH_TIMEOUT_MS });
  const results = response.data.results.map((r) => {
    const snippet = toPlainText(r.description ?? '', MAX_SNIPPET_CHARS);
    return {
      type: r.type,
      id: r.id,
      title: r.title,
      url: resultUrl(r, ctx.redmineUrl),
      datetime: r.datetime,
      snippet: snippet.text,
      snippetTruncated: snippet.truncated,
    };
  });

  return {
    total: response.data.total_count,
    offset,
    count: results.length,
    truncated: response.data.total_count > offset + results.length,
    results,
  };
};

export const searchRedmineTool: McpToolDef = {
  name: 'search_redmine',
  description: 'Search Redmine issues and wiki pages by keyword or version number across all projects ' +
    '(e.g. find the Build-Request issue for version 7.5.44.1). Matches titles only by default; ' +
    'if nothing is found, retry with titlesOnly=false. Results include the type, id, title, url ' +
    'and a short snippet. Forum messages, news and documents cannot be read in full through any tool, so always give the user the url of such a hit; use get_issue with an issue id for details, or get_wiki_page (project id from ' +
    'list_projects) to read a wiki page found here.',
  inputSchema,
  handler: searchRedmine,
};
