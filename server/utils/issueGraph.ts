import axios from 'axios';

const HARD_MAX_NODES = 200;
const HARD_MAX_TIMEOUT_MS = 30000;

export interface GraphOptionsInput {
    depth?: number;
    maxNodes?: number;
    timeoutMs?: number;
}

export interface FetchIssueGraphParams {
    redmineUrl: string;
    headers: Record<string, string>;
    depth: number;
    maxNodes: number;
    timeoutMs: number;
}

export const clampGraphOptions = (opts: GraphOptionsInput) => {
    const depth = Math.min(Math.max(Math.trunc(opts.depth ?? 2), 1), 5);
    const maxNodes = Math.min(Math.max(Math.trunc(opts.maxNodes ?? 50), 1), HARD_MAX_NODES);
    const timeoutMs = Math.min(Math.max(Math.trunc(opts.timeoutMs ?? 5000), 1), HARD_MAX_TIMEOUT_MS);
    return { depth, maxNodes, timeoutMs };
};

interface RelationLink {
    otherId: number;
    edgeId: string;
    type: IssueGraphEdgeType;
    source: number;
    target: number;
    label: string;
}

const RELATION_LABELS: Record<string, { type: IssueGraphEdgeType; label: string }> = {
    relates: { type: 'relates', label: 'relates to' },
    duplicates: { type: 'duplicates', label: 'duplicates' },
    duplicated: { type: 'duplicates', label: 'duplicated by' },
    blocks: { type: 'blocks', label: 'blocks' },
    blocked: { type: 'blocks', label: 'blocked by' },
    precedes: { type: 'precedes', label: 'precedes' },
    follows: { type: 'precedes', label: 'follows' },
    copied_to: { type: 'copied', label: 'copied to' },
    copied_from: { type: 'copied', label: 'copied from' },
};

const linksFromRawIssue = (raw: RawIssue): RelationLink[] => {
    const links: RelationLink[] = [];

    for (const rel of raw.relations ?? []) {
        const meta = RELATION_LABELS[rel.relation_type] ?? { type: 'relates' as IssueGraphEdgeType, label: rel.relation_type };
        const otherId = rel.issue_id === raw.id ? rel.issue_to_id : rel.issue_id;
        links.push({
            otherId,
            edgeId: `relation-${rel.id}`,
            type: meta.type,
            source: rel.issue_id,
            target: rel.issue_to_id,
            label: meta.label,
        });
    }

    const parentId = raw.parent?.id;
    if (parentId) {
        links.push({
            otherId: parentId,
            edgeId: `parent-${parentId}-${raw.id}`,
            type: 'parent',
            source: parentId,
            target: raw.id,
            label: 'parent of',
        });
    }

    for (const child of raw.children ?? []) {
        links.push({
            otherId: child.id,
            edgeId: `parent-${raw.id}-${child.id}`,
            type: 'parent',
            source: raw.id,
            target: child.id,
            label: 'parent of',
        });
    }

    return links;
};

const toGraphNode = (raw: RawIssue, isRoot: boolean, hasMoreRelations: boolean): IssueGraphNode => ({
    id: raw.id,
    subject: raw.subject,
    trackerId: raw.tracker?.id,
    trackerName: raw.tracker?.name,
    statusId: raw.status?.id,
    statusName: raw.status?.name,
    projectId: raw.project?.id,
    projectName: raw.project?.name,
    assignedToUserName: raw.assigned_to?.name,
    isRoot,
    hasMoreRelations,
});

export const fetchIssueGraph = async (
    rootId: number,
    { redmineUrl, headers, depth, maxNodes, timeoutMs }: FetchIssueGraphParams
): Promise<IssueGraphResponse> => {
    const startedAt = Date.now();
    const visited = new Set<number>([rootId]);
    const nodesById = new Map<number, IssueGraphNode>();
    const edgesById = new Map<string, IssueGraphEdge>();
    const queue: { id: number; level: number }[] = [{ id: rootId, level: 0 }];

    let hitMaxNodes = false;
    let hitTimeout = false;

    while (queue.length > 0) {
        if (Date.now() - startedAt >= timeoutMs) {
            hitTimeout = true;
            break;
        }

        const current = queue.shift()!;
        let raw: RawIssue;
        try {
            const response = await axios.get<{ issue: RawIssue }>(
                `${redmineUrl}/issues/${current.id}.json`,
                { params: { include: 'relations,children' }, headers }
            );
            raw = response.data.issue;
        } catch (error) {
            if (current.id === rootId) throw error;
            console.error(`Error fetching issue ${current.id} for graph:`, error);
            continue;
        }

        const links = linksFromRawIssue(raw);
        let hasMoreRelations = false;

        for (const link of links) {
            // Only record an edge once we know the other endpoint will actually be fetched
            // (already visited, or about to be enqueued) - otherwise it'd dangle in the response.
            const alreadyVisited = visited.has(link.otherId);

            if (!alreadyVisited) {
                if (current.level + 1 > depth) {
                    hasMoreRelations = true;
                    continue;
                }
                if (visited.size >= maxNodes) {
                    hasMoreRelations = true;
                    hitMaxNodes = true;
                    continue;
                }

                visited.add(link.otherId);
                queue.push({ id: link.otherId, level: current.level + 1 });
            }

            if (!edgesById.has(link.edgeId)) {
                edgesById.set(link.edgeId, {
                    id: link.edgeId,
                    source: link.source,
                    target: link.target,
                    type: link.type,
                    label: link.label,
                });
            }
        }

        nodesById.set(raw.id, toGraphNode(raw, current.id === rootId, hasMoreRelations));
    }

    // Timeout may leave edges pointing at neighbors that were queued but never fetched.
    // Drop those dangling edges and flag the known endpoint as having more relations.
    if (hitTimeout) {
        for (const edge of edgesById.values()) {
            const missingSource = !nodesById.has(edge.source);
            const missingTarget = !nodesById.has(edge.target);
            if (!missingSource && !missingTarget) continue;

            edgesById.delete(edge.id);
            const knownNode = nodesById.get(missingSource ? edge.target : edge.source);
            if (knownNode) knownNode.hasMoreRelations = true;
        }
    }

    const nodes = Array.from(nodesById.values());
    const anyMore = nodes.some(n => n.hasMoreRelations);
    const truncated = anyMore;
    const truncatedReason: IssueGraphResponse['truncatedReason'] = hitMaxNodes
        ? 'maxNodes'
        : hitTimeout
            ? 'timeout'
            : anyMore
                ? 'depth'
                : undefined;

    return {
        nodes,
        edges: Array.from(edgesById.values()),
        truncated,
        truncatedReason,
    };
};
