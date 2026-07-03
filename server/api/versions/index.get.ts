import axios from "axios";
import useRedmineAPI from "~/composables/useRedmineAPI";

interface VersionQuery {
    projectId?: string;
    status?: string;
}

export default defineEventHandler(async (event) => {
  
    const versionsData: Version[] = [];
    const config = useRuntimeConfig(event);
    const { createBaseRedmineHeader, mapRawVersionToVersion } = useRedmineAPI();

    // ================================
    // Check Query Parameter
    const query = getQuery<VersionQuery>(event);

    const projects: SupportProject[] = getSupportProjects();
    const headers = createBaseRedmineHeader(getRequestHeaders(event));

    if (query.projectId) {
        const url = `${config.public.redmineUrl}/projects/${query.projectId}/versions.json`;
        try {
            const response = await axios.get<VersionsResponse>(url, { headers });
            let versions: Version[] = response.data.versions.map(mapRawVersionToVersion);
            
            if (query.status) {
                versions = versions.filter(v => v.status === query.status);
            }

            versionsData.push(...versions);
        } catch (error) {
            console.error(`Error fetching versions for project ${query.projectId}:`, error);
        }
    } else {
        // Fetch for all projects in config
        const fetchPromises = projects.map(project => {
            const url = `${config.public.redmineUrl}/projects/${project.id}/versions.json`;
            return axios.get<VersionsResponse>(url, { headers })
                .then(response => response.data.versions.map(mapRawVersionToVersion))
                .catch(error => {
                    console.error(`Error fetching versions for project ${project.id}:`, error);
                    return [];
                });
        });

        const results = await Promise.all(fetchPromises);
        results.forEach(versions => versionsData.push(...versions));
    }

    // De-duplicate by ID
    const uniqueMap = new Map<number, Version>();
    versionsData.forEach(v => uniqueMap.set(v.id, v));
    
    return Array.from(uniqueMap.values());
});