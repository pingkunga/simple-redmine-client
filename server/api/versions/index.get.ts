import axios from "axios";
import useRedmineAPI from "~/composables/useRedmineAPI";

export default defineEventHandler<{query: { projectId: Number } }>(async (event) => {
  
    const versionsData: Version[] = [];
    const config = useRuntimeConfig(event);

    // ================================
    // Check Query Parameter
    const query = getQuery(event);

    let filterProjectId: number = 858;
    if (query.projectId) {
        filterProjectId= 858
    }
    // ================================

    const url = `${config.public.redmineUrl}/projects/${filterProjectId}/versions.json`;
    const headers = {
        'Content-Type': 'application/json',
        'X-Redmine-API-Key': config.redmineToken
    };

    const { mapRawVersionToVersion } = useRedmineAPI();

    try {
      const response = await axios.get<VersionsResponse>(url, { headers });
      //console.log(response.data.issues);

      const versions: Version[] = response.data.versions.map(mapRawVersionToVersion);
      versionsData.push(...versions);
    } 
    catch (error) {
        console.error('Error fetching issues:', error);
        throw error;
    }
    return versionsData;
});