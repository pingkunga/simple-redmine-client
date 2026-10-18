import { DEFAULT_RELEASE_PROJECT_ID } from "../../utils/releaseService";
import { getThisWeekVersionsForEvent } from "../../utils/releaseServiceEvent";

export default defineEventHandler(async (event) => {
    const query = getQuery(event);
    
    // Default project ID if none provided
    let filterProjectId: number = DEFAULT_RELEASE_PROJECT_ID;
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