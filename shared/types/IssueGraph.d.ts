export type IssueGraphEdgeType = 'relates' | 'blocks' | 'duplicates' | 'precedes' | 'copied' | 'parent';

export interface IssueGraphNode {
    id: number;
    subject: string;
    trackerId: number;
    trackerName: string;
    statusId: number;
    statusName: string;
    projectId: number;
    projectName: string;
    assignedToUserName?: string;
    isRoot: boolean;
    hasMoreRelations: boolean;
}

export interface IssueGraphEdge {
    id: string;
    source: number;
    target: number;
    type: IssueGraphEdgeType;
    label: string;
}

export interface IssueGraphResponse {
    nodes: IssueGraphNode[];
    edges: IssueGraphEdge[];
    truncated: boolean;
    truncatedReason?: 'maxNodes' | 'timeout' | 'depth';
}

export interface IssueGraphOptions {
    depth?: number;
    maxNodes?: number;
    timeoutMs?: number;
}
