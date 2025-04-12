import axios from "axios";
import { useFetch } from "nuxt/app";
import useRedmineAPI from "~/composables/useRedmineAPI";

export default defineEventHandler<{query: { project_id: number } }>(async (event) => {
    //http://localhost:3000/api/projects/project-member?project_id=858
    //http://localhost:3000/api/projects/project-member?project_id=858
    
    const query = getQuery(event);

    const config = useRuntimeConfig(event);

    /*
    GET https://www.sample.co.th/redmine/issues.json?fixed_version_id=6032&status_id=* HTTP/1.1
    Content-Type: application/json
    X-Redmine-API-Key: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
    */
    const { project_id } = query;
    if (!project_id) {
        return {
            error: 'Missing project_id parameter'
        };
    }

    const url = `${config.public.redmineUrl}/projects/${project_id}/memberships.json`;
    const headers = {
        'Content-Type': 'application/json',
        'X-Redmine-API-Key': config.redmineToken
    };

    const issuesData: Issue[] = [];

    const { mapRawMembershipToProjectMemberShip } = useRedmineAPI();

    const projectMemberData: Project[] = [];
    let currentOffset: number = 0;
    let isNotComplete: boolean = true;
    try {
        while (isNotComplete) {
            const params = {
                offset: currentOffset
            };
            const response = await axios.get<ProjectMemberShipResponse>(url, { params, headers });
            //console.log(response);

            const projectmembers: ProjectMemberShip[] = response.data.memberships.map(mapRawMembershipToProjectMemberShip);
            projectMemberData.push(...projectmembers);

            if (projectMemberData.length < response.data.total_count) {
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

    return projectMemberData;
});
