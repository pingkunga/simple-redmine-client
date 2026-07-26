import axios from "axios"
import path from "path"
import fs from "fs"
import useRedmineAPI from "~/composables/useRedmineAPI"
import { renderDevTrackerPayload } from "~~/server/utils/devTrackerTemplateMapper"

export default defineEventHandler(async (event) => {
    //$URI = "{{baseUrl}}/issues.json"

    //=================================
    const validateAssigneeBelongToProject = (pDevTrackerRequest: DevTrackerRequest) => {
        if (pDevTrackerRequest.project.id !== pDevTrackerRequest.assignTo.projectId) {
            throw createError({
                statusCode: 400,
                message: `Assignee ${pDevTrackerRequest.assignTo.name} does not belong to the project ${pDevTrackerRequest.project.name}`,
                statusMessage: `Assignee ${pDevTrackerRequest.assignTo.name} does not belong to the project ${pDevTrackerRequest.project.name}`,
            })
        }
    }

    const validateVersionBelongToProject = (pDevTrackerRequest: DevTrackerRequest) => {
        const {versionShareType } = useRedmineAPI()
        if ((pDevTrackerRequest.targetVerion.sharing === versionShareType.DESCENDANTS)
         || (pDevTrackerRequest.targetVerion.sharing === versionShareType.HIERARCHY)
         || (pDevTrackerRequest.targetVerion.sharing === versionShareType.TREE))
        {
            return true;
        }
        
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
            validateAssigneeBelongToProject(pDevTrackerRequest);
            validateVersionBelongToProject(pDevTrackerRequest);

            const description = await readTemplate('ProgramSpecTemplate.textile');
            const updatedDescription = description.split("[BNZSELECTVERSION]").join(pDevTrackerRequest.targetVerion.name);

            const today = new Date().toISOString().split('T')[0]
            const body = await renderDevTrackerPayload('TemplateReq_ProgramSpec.json', {
                '[BNZPROJECTID]': String(pDevTrackerRequest.project.id),
                '[BNZTRACKERID]': String(pDevTrackerRequest.tracker_id),
                '[BNZASSIGNEDTOID]': String(pDevTrackerRequest.assignTo.id),
                '[BNZFIXEDVERSIONID]': String(pDevTrackerRequest.targetVerion.id),
                '[BNZSUBJECT]': pDevTrackerRequest.subject,
                '[BNZDESCRIPTION]': updatedDescription,
                '[BNZSTARTDATE]': today,
                '[BNZDUEDATE]': today,
                '[BNZIMPACTNOTE]': "Impact Note\n- รบกวนสอบถาม " + pDevTrackerRequest.assignTo.name,
            })

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

    const createDefectSpec = async (pDevTrackerRequest: DevTrackerRequest) => {
        try {
            //validate project id
            validateAssigneeBelongToProject(pDevTrackerRequest);
            validateVersionBelongToProject(pDevTrackerRequest);

            const description = await readTemplate('DefectTemplate.textile');
            const updatedDescription = description.split("[BNZSELECTVERSION]").join(pDevTrackerRequest.targetVerion.name);

            //18 = Severity
            //14 = Found Phase
            //13 = Original Phase
            //44 = Developer's Comment
            const today = new Date().toISOString().split('T')[0]
            const body = await renderDevTrackerPayload('TemplateReq_Defect.json', {
                '[BNZPROJECTID]': String(pDevTrackerRequest.project.id),
                '[BNZTRACKERID]': String(pDevTrackerRequest.tracker_id),
                '[BNZASSIGNEDTOID]': String(pDevTrackerRequest.assignTo.id),
                '[BNZFIXEDVERSIONID]': String(pDevTrackerRequest.targetVerion.id),
                '[BNZSUBJECT]': pDevTrackerRequest.subject,
                '[BNZDESCRIPTION]': updatedDescription,
                '[BNZSTARTDATE]': today,
                '[BNZDUEDATE]': today,
                '[BNZIMPACTNOTE]': "Impact Note\n- รบกวนสอบถาม " + pDevTrackerRequest.assignTo.name,
            })

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
    
    const readTemplate = async (pFileName: String): Promise<string> => {
        const filePath = path.join(process.cwd(), 'public', `IssueTemplate/DevTracker/${pFileName}`)
        const data = await fs.promises.readFile(filePath, 'utf-8')
        return data
    }
    //=================================

    const {createBaseRedmineHeader, TRACKER} = useRedmineAPI()
    const config = useRuntimeConfig(event)

    const url = `${config.public.redmineUrl}/issues.json`
    const baseUpdateUrl = `${config.public.redmineUrl}/issues/`

    const req = getRequestHeaders(event)
    const headers = createBaseRedmineHeader(req)

    const body = await readBody(event)
    const devTrackerRequest : DevTrackerRequest = body.DevTrackerRequest

    console.log("devTrackerRequest", devTrackerRequest)

    if (devTrackerRequest.tracker_id === TRACKER.PROGRAM_SPEC) {
        return await createProgramSpec(devTrackerRequest)
    }
    else if (devTrackerRequest.tracker_id === TRACKER.DEFECT) {
        return await createDefectSpec(devTrackerRequest)
    }
    else {
        throw createError({
            statusCode: 500,
            message: `Tracker ${devTrackerRequest.tracker_id} is not supported`,
            statusMessage: `Tracker ${devTrackerRequest.tracker_id} is not supported`,
        })
    }
})