import axios from "axios";
import useRedmineAPI from "~/composables/useRedmineAPI";

interface GraphQuery {
    id?: string;
    depth?: string;
    maxNodes?: string;
    timeoutMs?: string;
}

export default defineEventHandler(async (event) => {
    // GET /api/issues/graph?id=334586&depth=2&maxNodes=50&timeoutMs=5000

    const query = getQuery<GraphQuery>(event);
    const rootId = Number(query.id);

    if (!query.id || Number.isNaN(rootId)) {
        throw createError({ statusCode: 400, statusMessage: "Query param 'id' must be a numeric issue id" });
    }

    const { depth, maxNodes, timeoutMs } = clampGraphOptions({
        depth: query.depth ? Number(query.depth) : undefined,
        maxNodes: query.maxNodes ? Number(query.maxNodes) : undefined,
        timeoutMs: query.timeoutMs ? Number(query.timeoutMs) : undefined,
    });

    const config = useRuntimeConfig(event);
    const { createBaseRedmineHeader } = useRedmineAPI();
    const headers = createBaseRedmineHeader(getRequestHeaders(event));

    try {
        return await fetchIssueGraph(rootId, {
            redmineUrl: config.public.redmineUrl,
            headers,
            depth,
            maxNodes,
            timeoutMs,
        });
    } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 404) {
            throw createError({ statusCode: 404, statusMessage: `Issue ${rootId} not found` });
        }
        console.error(`Error building issue graph for ${rootId}:`, error);
        throw createError({ statusCode: 502, statusMessage: "Failed to build issue graph from Redmine" });
    }
});
