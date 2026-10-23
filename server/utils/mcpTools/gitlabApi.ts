import axios from 'axios';
import { z } from 'zod';
import { toPlainText } from './plainText';
import { TOOL_TIMEOUT_MS } from './types';

/** GET-only GitLab REST v4 call using the server token (same config as gitlabCache.ts). */
export const gitlabGet = async <T>(path: string, params?: Record<string, unknown>): Promise<T> => {
  const config = useRuntimeConfig();
  const gitlabUrl = config.public.gitlabUrl as string;
  const gitlabToken = (config as any).gitlabToken as string;
  if (!gitlabUrl) throw new Error('GitLab URL is not configured');

  try {
    const response = await axios.get<T>(`${gitlabUrl}/api/v4${path}`, {
      headers: { 'PRIVATE-TOKEN': gitlabToken },
      params,
      timeout: TOOL_TIMEOUT_MS,
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      throw new Error('GitLab project / merge request / commit / wiki page not found (or the token cannot read it)');
    }
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      throw new Error('GitLab rejected the server token');
    }
    throw error;
  }
};

/** Shared by both tools: a numeric project id, or a path like "invest/invest-net-resource". */
export const projectInput = {
  projectId: z.number().int().positive().optional()
    .describe('Numeric GitLab project id. Prefer projectPath when you have a merge request / commit link.'),
  projectPath: z.string().trim().min(3).max(200).regex(/^[\w.-]+(\/[\w.-]+)+$/, 'Expected group/project')
    .refine(p => p.split('/').every(s => s !== '.' && s !== '..'), 'Path segments cannot be "." or ".."')
    .optional()
    .describe('Project path from a GitLab link, e.g. "invest/invest-net-resource" (the part before "/-/merge_requests/..."). Ignored when projectId is given.'),
};

export const projectRef = (a: { projectId?: number; projectPath?: string }): string => {
  if (a.projectId !== undefined) return String(a.projectId);
  if (a.projectPath) return encodeURIComponent(a.projectPath);
  throw new Error('Provide projectId or projectPath');
};

export const diffInput = {
  includeDiff: z.boolean().optional()
    .describe('Also return the diff text of each changed file. Default false: only the file list and line counts.'),
  maxFiles: z.number().int().min(1).max(100).optional()
    .describe('Max files listed (default 50, max 100)'),
  maxDiffChars: z.number().int().min(500).max(40_000).optional()
    .describe('Max total diff characters across all files when includeDiff is true (default 12000, max 40000)'),
};

export const DEFAULT_MAX_FILES = 50;
export const DEFAULT_MAX_DIFF_CHARS = 12_000;

export interface GitLabDiffFile {
  old_path: string;
  new_path: string;
  diff?: string;
  new_file?: boolean;
  renamed_file?: boolean;
  deleted_file?: boolean;
  generated_file?: boolean | null;
  collapsed?: boolean;
  too_large?: boolean;
}

const countLines = (diff: string) => {
  let additions = 0;
  let deletions = 0;
  for (const line of diff.split('\n')) {
    if (line.startsWith('+') && !line.startsWith('+++')) additions++;
    else if (line.startsWith('-') && !line.startsWith('---')) deletions++;
  }
  return { additions, deletions };
};

/**
 * File list with line counts always; diff text only when asked, within a shared character budget.
 * Files GitLab withheld (collapsed / too_large) or generated are flagged and never carry text.
 */
export const summarizeDiffs = (
  files: GitLabDiffFile[],
  opts: { includeDiff?: boolean; maxFiles?: number; maxDiffChars?: number },
) => {
  const maxFiles = opts.maxFiles ?? DEFAULT_MAX_FILES;
  let budget = opts.maxDiffChars ?? DEFAULT_MAX_DIFF_CHARS;
  let diffTruncated = false;

  const listed = files.slice(0, maxFiles).map(f => {
    const withheld = !!(f.collapsed || f.too_large);
    const text = withheld ? '' : f.diff ?? '';
    const row: Record<string, unknown> = {
      path: f.new_path,
      ...(f.renamed_file && { oldPath: f.old_path }),
      status: f.new_file ? 'added' : f.deleted_file ? 'deleted' : f.renamed_file ? 'renamed' : 'modified',
      ...countLines(text),
      ...(f.collapsed && { collapsed: true }),
      ...(f.too_large && { tooLarge: true }),
      ...(f.generated_file && { generated: true }),
    };

    if (opts.includeDiff && !withheld && !f.generated_file && text) {
      if (budget <= 0) {
        diffTruncated = true;
      } else {
        const piece = text.length > budget ? `${text.slice(0, budget)}\n… [diff cut]` : text;
        if (text.length > budget) diffTruncated = true;
        budget -= text.length;
        row.diff = piece;
      }
    }
    return row;
  });

  return {
    fileCount: files.length,
    filesTruncated: files.length > listed.length,
    ...(opts.includeDiff && { diffTruncated }),
    files: listed,
  };
};

/** Free text (titles, messages, descriptions) as short plain text; GitLab author emails are never returned. */
export const shortText = (value: string | null | undefined, max: number): string | undefined =>
  value ? toPlainText(value.replace(/\r\n?/g, '\n'), max).text : undefined;
