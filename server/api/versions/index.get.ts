import axios from "axios";
import useRedmineAPI from "~/composables/useRedmineAPI";

export default defineEventHandler(async (event) => {
  
  /*
    //Get Version from redmine
    const config = useRuntimeConfig(event);

    const param = {
        baseUrl: config.redmineUrl,
        token: config.redmineToken,
    }
    
    const response = await fetch(`${param.baseUrl}/projects/858/versions.json`, {
        headers: {
            'X-Redmine-API-Key': param.token
        }
    });

    if (!response.ok) {
        throw new Error(`Error fetching Redmine version: ${response.statusText}`);
    }

    const data = await response.json();
    //console.log(data);

    const versionsData: RawVersion[] = data.versions.map((version: any) => ({
        id: version.id,
        project: {
          id: version.project.id,
          name: version.project.name
        },
        name: version.name,
        description: version.description,
        status: version.status,
        due_date: version.due_date,
        sharing: version.sharing,
        wiki_page_title: version.wiki_page_title,
        created_on: version.created_on,
        updated_on: version.updated_on
      }));
    
      const versionsResponse: VersionsResponse = {
        versions: versionsData,
        total_count: data.total_count
      };
    
    //console.log(versionsResponse);
    return versionsResponse;
*/
    const versionsData: Version[] = [];
    const config = useRuntimeConfig(event);

    const url = `${config.redmineUrl}/projects/858/versions.json`;
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