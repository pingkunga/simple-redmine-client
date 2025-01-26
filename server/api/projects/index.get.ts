import axios from "axios";
import useRedmineAPI from "~/composables/useRedmineAPI";

export default defineEventHandler(async (event) => {
    const config = useRuntimeConfig(event);

    const url = `${config.public.redmineUrl}/projects.json`;
    const headers = {
        'Content-Type': 'application/json',
        'X-Redmine-API-Key': config.redmineToken
    };

    const { mapRawProjectToProject } = useRedmineAPI();

    const projectData: Project[] = [];
    let currentOffset: number = 0;
    let isNotComplete: boolean = true;
    try {
        while (isNotComplete) {
            const params = {
                offset: currentOffset
            };
            const response = await axios.get<ProjectsResponse>(url, { params, headers });
            //console.log(response);

            const projects: Project[] = response.data.projects.map(mapRawProjectToProject);
            projectData.push(...projects);

            if (projectData.length < response.data.total_count) {
                currentOffset += response.data.limit;
                isNotComplete = true;
            }
            else
            {
                isNotComplete = false;
            }
        }
    } 
    catch (error) {
        isNotComplete = false;
        console.error('Error fetching issues:', error);
        throw error;
    }
    finally{
        isNotComplete = false;
    }

    return projectData;
});