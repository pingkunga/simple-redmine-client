import { DevTrackerRequest } from "~/types/DevTracker"

export default defineEventHandler(async (event) => {

    //$URI = "{{baseUrl}}/issues.json"
  
    const config = useRuntimeConfig(event)
    const url = `${config.public.redmineUrl}/issues.json`

    const body = await readBody(event)
    const devTrackerRequest : DevTrackerRequest = body.DevTrackerRequest

    console.log("devTrackerRequest", devTrackerRequest)
    //prepare request by type
    /*
    const body = await readBody(event)
    const version : Version  = body.version
    const headers = {
        'Content-Type': 'application/json',
        'X-Redmine-API-Key': config.redmineToken
    }

    const body = await readBody(event)
    const version : Version  = body.version

    try {
        const response = await axios.post(url, { version }, { headers })
        return response.data
    } catch (error) {
        console.error('Error adding version:', error)
        throw error
    }
    */
})