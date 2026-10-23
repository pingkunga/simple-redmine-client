import axios from 'axios';
import { z } from 'zod';
import { TOOL_TIMEOUT_MS, type McpToolDef, type ToolContext } from './types';

const DEFAULT_MAX_CHARS = 6000;
const MAX_MAX_CHARS = 20_000;

interface RawAttachment {
  id: number;
  filename: string;
  filesize?: number;
  content_type?: string;
  description?: string;
  created_on?: string;
}

interface RawWikiPageDetail {
  title: string;
  parent?: { title: string };
  text?: string;
  version: number;
  author?: { id: number; name: string };
  comments?: string;
  created_on: string;
  updated_on: string;
  attachments?: RawAttachment[];
}

const inputSchema = {
  projectId: z.union([z.number().int().positive(), z.string().min(1).max(100)])
    .describe('Redmine project id or identifier'),
  title: z.string().min(1).max(255)
    .describe('Exact page title as returned by list_wiki_pages or search_redmine'),
  version: z.number().int().min(1).optional()
    .describe('Older page version to read (default: current)'),
  includeAttachments: z.boolean().optional()
    .describe('Also list attachment metadata (default false)'),
  maxChars: z.number().int().min(100).max(MAX_MAX_CHARS).optional()
    .describe(`Max characters of page text to return (default ${DEFAULT_MAX_CHARS}, max ${MAX_MAX_CHARS})`),
  textOffset: z.number().int().min(0).optional()
    .describe('Character offset to continue reading a long page (use nextTextOffset from the previous call)'),
};
const schema = z.object(inputSchema);

export const getWikiPage = async (rawArgs: unknown, ctx: ToolContext) => {
  const { projectId, title, version, includeAttachments, maxChars = DEFAULT_MAX_CHARS, textOffset = 0 } =
    schema.parse(rawArgs);

  const pagePath = `${encodeURIComponent(title)}${version === undefined ? '' : `/${version}`}`;
  const response = await axios.get<{ wiki_page: RawWikiPageDetail }>(
    `${ctx.redmineUrl}/projects/${encodeURIComponent(String(projectId))}/wiki/${pagePath}.json`,
    {
      headers: ctx.headers,
      params: includeAttachments ? { include: 'attachments' } : undefined,
      timeout: TOOL_TIMEOUT_MS,
    },
  ).catch((error) => {
    const status = axios.isAxiosError?.(error) ? error.response?.status : undefined;
    if (status === 404) throw new Error(`Wiki page "${title}" not found in project ${projectId}`);
    if (status === 403) throw new Error(`No permission to read the wiki of project ${projectId}`);
    throw error;
  });

  const page = response.data.wiki_page;
  const fullText = page.text ?? '';
  // Raw textile on purpose: stripping tags would also drop <pre>/<code> content such as commands.
  const text = fullText.slice(textOffset, textOffset + maxChars);
  const end = textOffset + text.length;
  const textTruncated = end < fullText.length;

  return {
    title: page.title,
    parent: page.parent?.title,
    version: page.version,
    author: page.author?.name,
    comments: page.comments || undefined,
    createdOn: page.created_on,
    updatedOn: page.updated_on,
    text,
    textLength: fullText.length,
    textTruncated,
    nextTextOffset: textTruncated ? end : undefined,
    attachments: includeAttachments
      ? (page.attachments ?? []).map(a => ({
          id: a.id,
          filename: a.filename,
          filesize: a.filesize,
          contentType: a.content_type,
          description: a.description || undefined,
          createdOn: a.created_on,
        }))
      : undefined,
  };
};

export const getWikiPageTool: McpToolDef = {
  name: 'get_wiki_page',
  description: 'Read one Redmine wiki page (textile text, author, version) by project and exact title. ' +
    'Long pages are returned in parts: when textTruncated is true, call again with textOffset=nextTextOffset ' +
    'or tell the user the text is partial. Find titles with list_wiki_pages or search_redmine.',
  inputSchema,
  handler: getWikiPage,
};
