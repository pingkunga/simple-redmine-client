import axios from "axios";
import { useFetch } from "nuxt/app";
import useRedmineAPI from "~/composables/useRedmineAPI";

export default defineEventHandler<{query: { version_id: string } }>(async (event) => {
    //http://localhost:3000/api/issues/issue-version?version_id=6032,6034

    const query = getQuery(event);
    //https://stackoverflow.com/questions/76896297/how-to-add-typing-to-getqueryevent-in-nuxt-3
    const versionIds = query.version_id ? query.version_id.split(',').map(Number) : [];

    
    const config = useRuntimeConfig(event);

    /*
    GET https://www.sample.co.th/redmine/issues.json?fixed_version_id=6032&status_id=* HTTP/1.1
    Content-Type: application/json
    X-Redmine-API-Key: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
    */

    const url = `${config.public.redmineUrl}/issues.json`;
    const headers = {
        'Content-Type': 'application/json',
        'X-Redmine-API-Key': config.redmineToken
    };

    const issuesData: Issue[] = [];

    const { mapRawIssueToIssue } = useRedmineAPI();

    try {
        for (const versionId of versionIds) {
            const params = {
                fixed_version_id: versionId,
                status_id: '*'
            };
            
            const response = await axios.get<IssuesResponse>(url, { params, headers });
            //console.log(response.data.issues);

            const issues: Issue[] = response.data.issues.map(mapRawIssueToIssue);
            issuesData.push(...issues);
        }
    } 
    catch (error) {
        console.error('Error fetching issues:', error);
        throw error;
    }

    return issuesData;
});
