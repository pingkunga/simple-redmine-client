import axios from "axios";
import useRedmineAPI from "~/composables/useRedmineAPI";


export default defineEventHandler<{query: { projectId: Number } }>(async (event) => {
  
    const versionsData: Version[] = [];
    const config = useRuntimeConfig(event);
    const { createBaseRedmineHeader, mapRawVersionToVersion } = useRedmineAPI();

    // ================================
    // Check Query Parameter
    const query = getQuery(event);

    const projects: SupportProject[] = getSupportProjects();
    const headers = createBaseRedmineHeader(getRequestHeaders(event));

    if (query.projectId) {
        const url = `${config.public.redmineUrl}/projects/${query.projectId}/versions.json`;
        try {
            const response = await axios.get<VersionsResponse>(url, { headers });
            const versions: Version[] = response.data.versions.map(mapRawVersionToVersion);
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

    return versionsData;
});