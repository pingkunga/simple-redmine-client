import axios from "axios";

export default defineEventHandler(async (event) => {
    /*
    ### UPDATE VERSION
    PUT {{baseUrl}}/versions/5331.json HTTP/1.1
    Content-Type: application/json
    X-Redmine-API-Key: {{apiKey}}

    {
        "version": {
            "status": "open",
            "sharing": "tree",
            "due_date": "2023-03-19",
            "description": "Internal 1version for QA/UAT ห้ามนำไปขึ้นให้ลูกค้าใช้งานจริง"
        }
    }
    */

    const body = await readBody(event)
    const version : Version = body.version
    const versionid = getRouterParam(event, 'id');


    const config = useRuntimeConfig(event)
    const url = `${config.public.redmineUrl}/versions/${versionid}.json`

    const headers = {
        'Content-Type': 'application/json',
        'X-Redmine-API-Key': config.redmineToken
    }

    try {
        const response = await axios.put(url, { version }, { headers })
        return response.data
    } catch (error) {
        console.error('Error updating version:', error)
        throw error
    }

   
});