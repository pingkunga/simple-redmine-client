import { getIssueGraphTool } from './getIssueGraph';
import { getGitlabCommitTool } from './getGitlabCommit';
import { getGitlabMergeRequestTool } from './getGitlabMergeRequest';
import { getGitlabWikiPageTool } from './getGitlabWikiPage';
import { getIssueTool } from './getIssue';
import { getIssuesByVersionTool } from './getIssuesByVersion';
import { getThisWeekReleasesTool } from './getThisWeekReleases';
import { listGitlabBranchesTool } from './listGitlabBranches';
import { listGitlabWikiPagesTool } from './listGitlabWikiPages';
import { getWikiPageTool } from './getWikiPage';
import { listProjectsTool } from './listProjects';
import { listVersionsTool } from './listVersions';
import { listWikiPagesTool } from './listWikiPages';
import { searchRedmineTool } from './searchRedmine';
import type { McpToolDef } from './types';

/**
 * Every tool exposed over MCP (in-app chat and external clients). Phase 1 is read-only:
 * never add a tool that creates, updates, deletes or sends anything here.
 * Permanently excluded: auto-create-build-inv, send-release-mail, DELETE /api/versions/[id].
 */
export const mcpTools: McpToolDef[] = [
  listProjectsTool,
  listVersionsTool,
  getIssuesByVersionTool,
  getIssueTool,
  getIssueGraphTool,
  listGitlabBranchesTool,
  getGitlabMergeRequestTool,
  getGitlabCommitTool,
  getThisWeekReleasesTool,
  searchRedmineTool,
  listWikiPagesTool,
  getWikiPageTool,
  listGitlabWikiPagesTool,
  getGitlabWikiPageTool,
];
