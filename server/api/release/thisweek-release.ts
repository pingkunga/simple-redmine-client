import { getThisWeekVersions } from "../../utils/releaseService";

export default defineEventHandler(async (event) => {
    const query = getQuery(event);
    
    // Default project ID if none provided
    let filterProjectId: number = 858;
    if (query.projectId) {
        filterProjectId = Number(query.projectId);
    }

    try {
        return await getThisWeekVersions(event, filterProjectId);
    } catch (error) {
        console.error('Error in thisweek-release API:', error);
        throw error;
    }
});