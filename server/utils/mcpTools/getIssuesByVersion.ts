import axios from 'axios';
import { z } from 'zod';
import { MAX_RESULTS, TOOL_TIMEOUT_MS, type McpToolDef, type ToolContext } from './types';

const PAGE_SIZE = 100;

const inputSchema = {
  versionId: z.number().int().positive()
    .describe('Numeric Redmine version id (resolve a version name with list_versions first)'),
  limit: z.number().int().min(1).max(MAX_RESULTS).optional()
    .describe(`Max issues to return (default ${MAX_RESULTS}, max ${MAX_RESULTS})`),
};
const schema = z.object(inputSchema);

export const getIssuesByVersion = async (rawArgs: unknown, ctx: ToolContext) => {
  const { versionId, limit = MAX_RESULTS } = schema.parse(rawArgs);

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

  // Free-text fields (description) are deliberately not returned: they inflate the payload
  // and are an untrusted-text channel into the model.
  return {
    versionId,
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
    })),
  };
};

export const getIssuesByVersionTool: McpToolDef = {
  name: 'get_issues_by_version',
  description:
    'List the issues assigned to a Redmine version (subject, tracker, status, assignee, due date). ' +
    'Takes a NUMERIC versionId. If the user gave a version NAME such as "8.9.15.4", call list_versions ' +
    'with the name filter first to get the id, then call this tool with that id.',
  inputSchema,
  handler: getIssuesByVersion,
};
