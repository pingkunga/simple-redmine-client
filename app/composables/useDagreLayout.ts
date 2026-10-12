import dagre from "@dagrejs/dagre";
import type { Node, Edge } from "@vue-flow/core";

const NODE_WIDTH = 220;
const NODE_HEIGHT = 110;

export default () => {
    const layout = (nodes: Node[], edges: Edge[], direction: "TB" | "LR" = "TB"): Node[] => {
        const graph = new dagre.graphlib.Graph();
        graph.setDefaultEdgeLabel(() => ({}));
        graph.setGraph({ rankdir: direction, nodesep: 60, ranksep: 100 });

        for (const node of nodes) {
            graph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
        }

        for (const edge of edges) {
            graph.setEdge(edge.source, edge.target);
        }

        dagre.layout(graph);

        return nodes.map(node => {
            const pos = graph.node(node.id);
            return {
                ...node,
                position: { x: pos.x - NODE_WIDTH / 2, y: pos.y - NODE_HEIGHT / 2 },
            };
        });
    };

    return { layout };
};
