import axios from "axios";
import { assertBranchExists, resolveScriptBranch } from "../../utils/scriptBranch";
import { setScriptBranch } from "../../utils/versionScriptBranchStore";

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

    const url = `${config.public.redmineUrl}/projects/${projectId}/versions.json`
    const headers = {
        'Content-Type': 'application/json',
        'X-Redmine-API-Key': config.redmineToken
    }

    // Script Branch is sent only when the Jenkins Version Folder is requested. Validate it before Redmine is
    // touched so a bad branch name does not leave a half-created Version behind.
    const scriptBranch = body.scriptBranch === undefined ? undefined : resolveScriptBranch(body.scriptBranch)
    if (scriptBranch) {
        await assertBranchExists(scriptBranch)
    }

    try {
        const response = await axios.post(url, { version }, { headers })
        if (scriptBranch && response.data?.version?.id) {
            // The Version already exists in Redmine, so a failed write must not turn this into a failed save.
            await setScriptBranch(response.data.version.id, scriptBranch)
                .catch(err => console.error('Error saving Script Branch:', err))
        }
        return response.data
    } catch (error) {
        console.error('Error adding version:', error)
        throw error
    }
    
});