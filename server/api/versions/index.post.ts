import { createRedmineVersion } from "../../utils/versionCreate";

export default defineEventHandler(async (event) => {

    /*
    ### ADD VERSION
    POST {{baseUrl}}/projects/{{projectId}}/versions.json HTTP/1.1
    Content-Type: application/json
    X-Redmine-API-Key: {{apiKey}}

    {
      "version": {
        "name": "9.9.9.14",
        "status": "open",
        "sharing": "tree",
        "due_date": "2023-03-19",
        "description": "Internal version for QA/UAT ห้ามนำไปขึ้นให้ลูกค้าใช้งานจริง"
      }
    }
    */

    const config = useRuntimeConfig(event)
    const body = await readBody(event)
    const version: Version = body.version
    const projectId = body.projectId || 858 // Fallback to 858 if not provided

    try {
        const { data } = await createRedmineVersion({
            redmineUrl: config.public.redmineUrl,
            redmineToken: config.redmineToken,
            projectId,
            version,
            scriptBranch: body.scriptBranch
        })
        return data
    } catch (error) {
        console.error('Error adding version:', error)
        throw error
    }

});
