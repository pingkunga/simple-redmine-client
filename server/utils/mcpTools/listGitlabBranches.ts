import { z } from 'zod';
import type { GitLabBranch } from '~~/shared/types/GitLab';
import { getGitLabBranches } from '../gitlabCache';
import { getSupportGitLabProjects } from '../projectConfig';
import { MAX_RESULTS, withTimeout, type McpToolDef, type ToolContext } from './types';

// getGitLabBranches pages through every branch with no cap or timeout of its own.
const GITLAB_TIMEOUT_MS = 30_000;

const inputSchema = {
  nameContains: z.string().max(64).optional()
    .describe('Case-insensitive substring of the branch name, e.g. "feature/login"'),
  projectId: z.number().int().positive().optional()
    .describe('GitLab project id. Usually omit it: users rarely know ids.'),
  projectName: z.string().trim().min(1).max(64).optional()
    .describe('Case-insensitive part of a configured GitLab project name, e.g. "gateway". Ignored when projectId is given.'),
  limit: z.number().int().min(1).max(MAX_RESULTS).optional()
    .describe(`Max branches to return (default 100, max ${MAX_RESULTS})`),
};
const schema = z.object(inputSchema);

interface Target {
  id: number;
  name: string;
}

export const listGitlabBranches = async (rawArgs: unknown, _ctx: ToolContext) => {
  const { nameContains, projectId, projectName, limit = 100 } = schema.parse(rawArgs ?? {});

  // Scope: explicit id > configured project name > every configured project.
  // The configured list (SupportGitLabProject.json) is a default scope, not a security boundary.
  const configured: Target[] = getSupportGitLabProjects();
  let targets: Target[];

  if (projectId !== undefined) {
    targets = [configured.find(p => p.id === projectId) ?? { id: projectId, name: `project ${projectId}` }];
  } else if (projectName) {
    const needle = projectName.toLowerCase();
    targets = configured.filter(p => p.name.toLowerCase().includes(needle));
    if (targets.length === 0) {
      return {
        resolved: false,
        reason: 'project_not_found',
        candidates: configured.slice(0, 10),
        hint: 'No configured GitLab project matches that name. Use one of the candidates, or pass projectId.',
      };
    }
  } else {
    if (configured.length === 0) {
      throw new Error('projectId is required: no GitLab project list is configured');
    }
    targets = configured;
  }

  const settled = await Promise.allSettled(
    targets.map(t => withTimeout(getGitLabBranches(String(t.id)), GITLAB_TIMEOUT_MS, `GitLab project ${t.id}`))
  );

  const failedScopes: string[] = [];
  const rows: ReturnType<typeof toRow>[] = [];
  settled.forEach((result, i) => {
    const target = targets[i]!;
    if (result.status === 'rejected') {
      console.error(`list_gitlab_branches: project ${target.id} failed:`, result.reason);
      failedScopes.push(String(target.id));
      return;
    }
    rows.push(...result.value.map(b => toRow(target, b)));
  });

  if (failedScopes.length === targets.length) {
    throw new Error(`Failed to fetch GitLab branches for project(s): ${failedScopes.join(', ')}`);
  }

  const needle = nameContains?.toLowerCase();
  const matched = (needle ? rows.filter(r => r.name.toLowerCase().includes(needle)) : rows)
    .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));

  // Commit titles/messages and author emails are free text / personal data; not returned.
  return {
    resolved: true,
    count: Math.min(matched.length, limit),
    truncated: matched.length > limit,
    partial: failedScopes.length > 0,
    failedScopes,
    searchedProjects: targets,
    branches: matched.slice(0, limit),
  };
};

const toRow = (target: Target, b: GitLabBranch) => ({
  projectId: target.id,
  projectName: target.name,
  name: b.name,
  creatorName: b.creator_name,
  createdAt: b.created_at,
  isDefault: b.default,
  isProtected: b.protected,
  isMerged: b.merged,
  lastCommitDate: b.commit?.committed_date,
});

export const listGitlabBranchesTool: McpToolDef = {
  name: 'list_gitlab_branches',
  description:
    'Find GitLab branches and who created them (creator, creation date, last commit date), newest first. ' +
    'Users rarely know a project id: if they did not name a project, OMIT projectId/projectName and search by ' +
    'branch name with nameContains; every result includes its project. Pass projectName (e.g. "gateway") when the ' +
    'user names a project. If "partial" is true some projects could not be read (see failedScopes). ' +
    'If resolved=false, show the candidate projects to the user.',
  inputSchema,
  handler: listGitlabBranches,
};
