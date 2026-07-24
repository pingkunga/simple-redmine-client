import type { Node, Edge } from "@vue-flow/core";

const RELATION_EDGE_STYLE: Record<IssueGraphEdgeType, { color: string; dashed: boolean }> = {
    relates: { color: "#6b7280", dashed: false },
    blocks: { color: "#ef4444", dashed: false },
    duplicates: { color: "#f59e0b", dashed: true },
    precedes: { color: "#3b82f6", dashed: false },
    copied: { color: "#8b5cf6", dashed: true },
    parent: { color: "#10b981", dashed: false },
};

export default () => {
    const getIssueGraph = async (id: number, options?: IssueGraphOptions) => {
        return await useFetch<IssueGraphResponse>("/api/issues/graph", {
            query: {
                id,
                ...(options?.depth ? { depth: options.depth } : {}),
                ...(options?.maxNodes ? { maxNodes: options.maxNodes } : {}),
                ...(options?.timeoutMs ? { timeoutMs: options.timeoutMs } : {}),
            },
        });
    };

    const expandNode = async (id: number): Promise<IssueGraphResponse> => {
        const { data, error } = await useFetch<IssueGraphResponse>("/api/issues/graph", {
            query: { id, depth: 1 },
        });

        if (error.value) {
            throw createError({
                ...error.value,
                statusMessage: `Failed to expand issue ${id}: ${error.value.statusMessage}`,
            });
        }

        return data.value as IssueGraphResponse;
    };

    const relationEdgeStyle = (type: IssueGraphEdgeType) => RELATION_EDGE_STYLE[type] ?? RELATION_EDGE_STYLE.relates;

    const toVueFlowElements = (nodes: IssueGraphNode[], edges: IssueGraphEdge[]): { nodes: Node[]; edges: Edge[] } => {
        const flowNodes: Node[] = nodes.map(node => ({
            id: String(node.id),
            type: "issue",
            position: { x: 0, y: 0 },
            data: { issue: node },
        }));

        const flowEdges: Edge[] = edges.map(edge => {
            const style = relationEdgeStyle(edge.type);
            return {
                id: edge.id,
                source: String(edge.source),
                target: String(edge.target),
                label: edge.label,
                style: { stroke: style.color, strokeDasharray: style.dashed ? "5,5" : undefined },
                labelStyle: { fill: style.color },
            };
        });

        return { nodes: flowNodes, edges: flowEdges };
    };

    // Merges freshly-fetched nodes/edges into an existing Vue Flow element set, deduping by id.
    const mergeGraphResponse = (
        existing: { nodes: Node[]; edges: Edge[] },
        incoming: IssueGraphResponse
    ): { nodes: Node[]; edges: Edge[] } => {
        const { nodes: newNodes, edges: newEdges } = toVueFlowElements(incoming.nodes, incoming.edges);

        const nodeById = new Map(existing.nodes.map(n => [n.id, n]));
        for (const node of newNodes) {
            if (!nodeById.has(node.id)) nodeById.set(node.id, node);
            else nodeById.set(node.id, { ...nodeById.get(node.id), data: node.data });
        }

        const edgeById = new Map(existing.edges.map(e => [e.id, e]));
        for (const edge of newEdges) {
            if (!edgeById.has(edge.id)) edgeById.set(edge.id, edge);
        }

        return { nodes: Array.from(nodeById.values()), edges: Array.from(edgeById.values()) };
    };

    return { getIssueGraph, expandNode, toVueFlowElements, relationEdgeStyle, mergeGraphResponse };
};
