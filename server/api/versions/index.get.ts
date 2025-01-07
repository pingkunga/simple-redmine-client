import axios from "axios";
import useRedmineAPI from "~/composables/useRedmineAPI";

export default defineEventHandler(async (event) => {
  
    const versionsData: Version[] = [];
    const config = useRuntimeConfig(event);

    const url = `${config.public.redmineUrl}/projects/858/versions.json`;
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