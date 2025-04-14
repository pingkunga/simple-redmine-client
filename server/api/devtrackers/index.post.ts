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
                message: `Assignee ${pDevTrackerRequest.assignTo.name} does not belong to the project ${pDevTrackerRequest.project.name}`,
                statusMessage: `Assignee ${pDevTrackerRequest.assignTo.name} does not belong to the project ${pDevTrackerRequest.project.name}`,
            })
        }
    }

    const validateVersionBelongToProhject = (pDevTrackerRequest: DevTrackerRequest) => {
        if (pDevTrackerRequest.project.id !== pDevTrackerRequest.targetVerion.projectid) {
            throw createError({
                statusCode: 400,
                message: `Version ${pDevTrackerRequest.targetVerion.name} does not belong to the project ${pDevTrackerRequest.project.name}`,
                statusMessage: `Version ${pDevTrackerRequest.targetVerion.name} does not belong to the project ${pDevTrackerRequest.project.name}`,
            })
        }
    }

    const createProgramSpec = async (pDevTrackerRequest: DevTrackerRequest) => {
        try {
            //validate project id
            validateAssigneeBelongToProhject(pDevTrackerRequest);
            validateVersionBelongToProhject(pDevTrackerRequest);

            const description = await readProgramSpecTemplate();
            const updatedDescription = description.split("[BNZSELECTVERSION]").join(pDevTrackerRequest.targetVerion.name); 

            const body = {
                issue: {
                    project_id: pDevTrackerRequest.project.id,
                    tracker_id: pDevTrackerRequest.tracker_id,
                    status_id: 16,
                    priority_id: 4,
                    assigned_to_id: pDevTrackerRequest.assignTo.id,
                    fixed_version_id: pDevTrackerRequest.targetVerion.id,
                    subject: pDevTrackerRequest.subject,
                    description: updatedDescription,
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
                        },
                        {
                            id: 44,
                            value: "Impact Note\n- รบกวนสอบถาม " + pDevTrackerRequest.assignTo.name
                        }
                    ]
                }
            }

            console.log("Request body:", body);

            const response = await axios.post(url, body, { headers })
            const issueId = response.data.issue.id
            console.log("Issue created with ID:", issueId);

            const updatedDescriptionWithId = await UpdateDescRedmineId(response.data.issue.description, issueId)
            console.log("Updated description with Redmine ID:", updatedDescriptionWithId);

            return issueId

        } catch (error) {
            console.error('Error adding issue:', error)
            throw error
        }
    }

    const UpdateDescRedmineId = async (description: string, redmineId: string) => {
        const updatedDescription = description.split("[BNZGENREDMINEID]").join(redmineId)
        const body = {
            issue: {
                description: updatedDescription,
            }
        };

        const updateResponse = await axios.put(`${baseUpdateUrl}${redmineId}.json`, body, { headers })
        if (updateResponse.status !== 204) {
            throw createError({
                statusCode: 500,
                message: `Update Redmine Id ${redmineId} failed`,
                statusMessage: `Update Redmine Id ${redmineId} failed`,
            })
        }
        console.log("UpdateDescRedmineId Completed", updateResponse.status)
        return updatedDescription
    }

    const readProgramSpecTemplate = async (): Promise<string> => {
        const filePath = path.join(process.cwd(), 'public', 'IssueTemplate/ProgramSpecTemplate.textile')
        const data = await fs.promises.readFile(filePath, 'utf-8')
        return data
    }
    //=================================

    const {TRACKER} = useRedmineAPI()
    const config = useRuntimeConfig(event)

    const url = `${config.public.redmineUrl}/issues.json`
    const baseUpdateUrl = `${config.public.redmineUrl}/issues/`

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
    else {
        throw createError({
            statusCode: 500,
            message: `Tracker ${devTrackerRequest.tracker_id} is not supported`,
            statusMessage: `Tracker ${devTrackerRequest.tracker_id} is not supported`,
        })
    }
})