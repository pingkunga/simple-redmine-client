import { getThisWeekVersionsForEvent } from "../../utils/releaseServiceEvent";

export default defineEventHandler(async (event) => {
    const query = getQuery(event);
    
    // Default project ID if none provided
    let filterProjectId: number = 858;
    if (query.projectId) {
        filterProjectId = Number(query.projectId);
    }

    try {
        return await getThisWeekVersionsForEvent(event, filterProjectId);
    } catch (error) {
        console.error('Error in thisweek-release API:', error);
        throw error;
    }
});