import axios from 'axios';
import { z } from 'zod';
import { clampGraphOptions, fetchIssueGraph } from '../issueGraph';
import type { McpToolDef, ToolContext } from './types';

const inputSchema = {
  issueId: z.number().int().positive().describe('Numeric Redmine issue id (the root of the graph)'),
  depth: z.number().int().min(1).max(5).optional()
    .describe('How many relation hops to follow from the root (default 2, max 5)'),
  maxNodes: z.number().int().min(1).max(200).optional()
    .describe('Max issues in the graph (default 50, max 200)'),
};
const schema = z.object(inputSchema);

export const getIssueGraph = async (rawArgs: unknown, ctx: ToolContext) => {
  const { issueId, depth, maxNodes } = schema.parse(rawArgs);
  const options = clampGraphOptions({ depth, maxNodes });

  try {
    return await fetchIssueGraph(issueId, { redmineUrl: ctx.redmineUrl, headers: ctx.headers, ...options });
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      throw new Error(`Issue ${issueId} not found`);
    }
    throw error;
  }
};

export const getIssueGraphTool: McpToolDef = {
  name: 'get_issue_graph',
  description:
    'Show how a Redmine issue is related to others (blocks / blocked by, relates, duplicates, parent / child, ' +
    'precedes / follows, copies). Returns nodes and edges around the root issue. ' +
    'If a node has hasMoreRelations=true the graph was cut by depth or maxNodes.',
  inputSchema,
  handler: getIssueGraph,
};
