import axios from "axios";
import { deleteScriptBranch } from "../../../utils/versionScriptBranchStore";

export default defineEventHandler(async (event) => {
    /*
    ### DELETE VERSION
    DELETE {{baseUrl}}/versions/5331.json HTTP/1.1
    Content-Type: application/json
    X-Redmine-API-Key: {{apiKey}}
    */
    const versionid = getRouterParam(event, 'id');

    const config = useRuntimeConfig(event)
    const url = `${config.public.redmineUrl}/versions/${versionid}.json`

    const headers = {
        'Content-Type': 'application/json',
        'X-Redmine-API-Key': config.redmineToken
    }

    try {
        const response = await axios.delete(url, { headers })
        if (versionid) {
            await deleteScriptBranch(versionid)
                .catch(err => console.error('Error deleting Script Branch:', err))
        }
        return response.data
    } catch (error) {
        console.error('Error deleting version:', error)
        throw error
    }
});