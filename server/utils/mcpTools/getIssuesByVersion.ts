import axios from 'axios';
import { z } from 'zod';
import { listVersions } from './listVersions';
import { toPlainText } from './plainText';
import { MAX_RESULTS, TOOL_TIMEOUT_MS, type McpToolDef, type ToolContext } from './types';

const PAGE_SIZE = 100;
const MAX_CANDIDATES = 10;
// Same custom field the /issues page shows as "Impact Note" (see useRedmineAPI.ts).
const IMPACT_NOTE_FIELD = "Developer's Comment";
const MAX_IMPACT_NOTE_CHARS = 400;

const impactNoteOf = (issue: RawIssue) => {
  const value = issue.custom_fields?.find(f => f.name === IMPACT_NOTE_FIELD)?.value;
  const raw = Array.isArray(value) ? value.join('\n') : value;
  if (!raw) return {};
  const { text, truncated } = toPlainText(raw, MAX_IMPACT_NOTE_CHARS);
  return text ? { impactNote: text, ...(truncated && { impactNoteTruncated: true }) } : {};
};

const inputSchema = {
  versionId: z.number().int().positive().optional()
    .describe('Numeric Redmine version id. Use it as-is when the user gave one (e.g. "id=6532").'),
  versionName: z.string().trim().min(1).max(64).optional()
    .describe('Version name exactly as the user wrote it, e.g. "8.9.15.3". Ignored when versionId is given.'),
  projectId: z.number().int().positive().optional()
    .describe('Narrow the version-name lookup to this project (only used with versionName)'),
  limit: z.number().int().min(1).max(MAX_RESULTS).optional()
    .describe(`Max issues to return (default ${MAX_RESULTS}, max ${MAX_RESULTS})`),
};
// MCP registration takes the raw shape above; the "id or name" rule lives here.
const schema = z.object(inputSchema).refine(
  a => a.versionId !== undefined || a.versionName !== undefined,
  { message: 'Provide versionId or versionName' },
);

interface VersionSummary {
  id: number;
  name: string;
  projectId?: number;
  projectName?: string;
  status: string;
}

interface VersionLookup {
  partial: boolean;
  failedScopes: string[];
  versions: VersionSummary[];
}

export const getIssuesByVersion = async (rawArgs: unknown, ctx: ToolContext) => {
  const { versionId: givenId, versionName, projectId, limit = MAX_RESULTS } = schema.parse(rawArgs);

  let versionId = givenId;
  let resolvedFrom: VersionSummary | undefined;

  // A user-typed id is used as-is. Otherwise resolve the name here instead of relying on the
  // model to chain list_versions: exact (case-insensitive) match only, so "8.9.15.3" never
  // swallows "8.9.15.30".
  if (versionId === undefined) {
    const lookup = await listVersions({ projectId, name: versionName, limit: MAX_RESULTS }, ctx) as VersionLookup;
    const wanted = versionName!.trim().toLowerCase();
    const exact = lookup.versions.filter(v => v.name.trim().toLowerCase() === wanted);

    if (exact.length !== 1) {
      return {
        resolved: false,
        reason: exact.length > 1 ? 'ambiguous' : lookup.versions.length > 0 ? 'no_exact_match' : 'not_found',
        candidates: (exact.length > 1 ? exact : lookup.versions).slice(0, MAX_CANDIDATES),
        partial: lookup.partial,
        failedScopes: lookup.failedScopes,
        hint: 'Ask the user which version they mean, or call again with versionId (or projectId to narrow the search).',
      };
    }

    resolvedFrom = exact[0]!;
    versionId = resolvedFrom.id;
  }

  const issues: RawIssue[] = [];
  let total = 0;

  while (issues.length < limit) {
    const response = await axios.get<IssuesResponse>(`${ctx.redmineUrl}/issues.json`, {
      headers: ctx.headers,
      params: { fixed_version_id: versionId, status_id: '*', offset: issues.length, limit: PAGE_SIZE },
      timeout: TOOL_TIMEOUT_MS,
    });
    total = response.data.total_count;
    issues.push(...response.data.issues);
    if (issues.length >= total || response.data.issues.length === 0) break;
  }

  // The description is deliberately not returned: it inflates the payload and is an untrusted-text
  // channel into the model. The one free-text field exposed is the Impact Note, as plain text, capped.
  return {
    resolved: true,
    versionId,
    version: resolvedFrom
      ? { id: resolvedFrom.id, name: resolvedFrom.name, projectId: resolvedFrom.projectId }
      : { id: versionId },
    total,
    count: Math.min(issues.length, limit),
    truncated: total > Math.min(issues.length, limit),
    issues: issues.slice(0, limit).map(i => ({
      id: i.id,
      subject: i.subject,
      projectId: i.project?.id,
      projectName: i.project?.name,
      tracker: i.tracker?.name,
      status: i.status?.name,
      isClosed: i.status?.is_closed,
      assignedTo: i.assigned_to?.name,
      dueDate: i.due_date,
      doneRatio: i.done_ratio,
      ...impactNoteOf(i),
    })),
  };
};

export const getIssuesByVersionTool: McpToolDef = {
  name: 'get_issues_by_version',
  description:
    'List the issues assigned to a Redmine version (subject, tracker, status, assignee, due date, and the ' +
    "developer's Impact Note as impactNote when one was written). Takes ONE version per call; for several " +
    'versions call it once per version in the same step. ' +
    'If the user gave a numeric id (e.g. "id=6532") pass it as versionId. Otherwise pass versionName exactly as ' +
    'written (e.g. "8.9.15.3"); the tool looks the version up itself. If the result has resolved=false, ' +
    'show the candidates to the user and ask which one they mean, then call again with versionId.',
  inputSchema,
  handler: getIssuesByVersion,
};
