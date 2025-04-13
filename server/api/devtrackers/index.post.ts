import axios from "axios"
import { DevTrackerRequest } from "~/types/DevTracker"
import path from "path"
import fs from "fs"
import useRedmineAPI from "~/composables/useRedmineAPI"

export default defineEventHandler(async (event) => {

    //$URI = "{{baseUrl}}/issues.json"

    //=================================
    const validateAssigneeBelongToProhject = (pDevTrackerRequest: DevTrackerRequest) => {
        if (pDevTrackerRequest.project.id !== pDevTrackerRequest.assignTo.projectId) {
            throw createError({
                statusCode: 400,
                statusMessage: `Assignee ${pDevTrackerRequest.assignTo.name} does not belong to the project ${pDevTrackerRequest.project.name}`,
            })
        }
    }

    const validateVersionBelongToProhject = (pDevTrackerRequest: DevTrackerRequest) => {
        if (pDevTrackerRequest.project.id !== pDevTrackerRequest.targetVerion.projectid) {
            throw createError({
                statusCode: 400,
                statusMessage: `Version ${pDevTrackerRequest.targetVerion.name} does not belong to the project ${pDevTrackerRequest.project.name}`,
            })
        }
    }

    const createProgramSpec = async (pDevTrackerRequest: DevTrackerRequest) => {
        try {
            //validate project id
            validateAssigneeBelongToProhject(pDevTrackerRequest);
            validateVersionBelongToProhject(pDevTrackerRequest);

            const body = {
                issue: {
                    project_id: pDevTrackerRequest.project.id,
                    tracker_id: pDevTrackerRequest.tracker_id,
                    status_id: 1,
                    priority_id: 2,
                    assigned_to_id: pDevTrackerRequest.assignTo.id,
                    fixed_version_id: pDevTrackerRequest.targetVerion.id,
                    subject: pDevTrackerRequest.subject,
                    description: createProgramSpecDescription(pDevTrackerRequest),
                    start_date: new Date().toISOString().split('T')[0],
                    due_date: new Date().toISOString().split('T')[0],
                    custom_fields: [
                        {
                            id: 4,
                            value: "Implementation"
                        },
                        {
                            id: 34,
                            value: "Production"
                        }
                    ]
                }
            }

            console.log("body", body)

            //const response = await axios.post(url, body, { headers })
            //return response.data
        } catch (error) {
            console.error('Error adding issue:', error)
            throw error
        }
    }

    const createProgramSpecDescription = async (pDevTrackerRequest: DevTrackerRequest) => {
        const template = await readProgramSpecTemplate()
        //replace template with data
        let description = template
        //[BNZCREATEUSER] [BNZSELECTVERSION] [BNZGENREDMINEID]
        description = description.replace("[BNZCREATEUSER]", pDevTrackerRequest.assignTo.name)
        description = description.replace("[BNZSELECTVERSION]", pDevTrackerRequest.targetVerion.name)

        return description
    }

    const readProgramSpecTemplate = async () => {
        const filePath = path.join(process.cwd(), 'public', 'IssueTemplate/ProgramSpecTemplate.textile')
        const data = await fs.promises.readFile(filePath, 'utf-8')
        return data
    }
    //=================================

    const {TRACKER} = useRedmineAPI()
    const config = useRuntimeConfig(event)
    const url = `${config.public.redmineUrl}/issues.json`
    const headers = {
        'Content-Type': 'application/json',
        'X-Redmine-API-Key': config.redmineToken
    }

    const body = await readBody(event)
    const devTrackerRequest : DevTrackerRequest = body.DevTrackerRequest

    console.log("devTrackerRequest", devTrackerRequest)

    if (devTrackerRequest.tracker_id === TRACKER.PROGRAM_SPEC) {
        return await createProgramSpec(devTrackerRequest)
    }
})