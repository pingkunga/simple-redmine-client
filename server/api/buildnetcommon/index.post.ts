import axios from "axios"
import path from "path"
import fs from "fs"
import useRedmineAPI from "~/composables/useRedmineAPI"

const readTemplate = async (pFileName: String): Promise<string> => {
    const filePath = path.join(process.cwd(), 'public', `IssueTemplate/${pFileName}`)
    const data = await fs.promises.readFile(filePath, 'utf-8')
    return data
}

const buildToggleMarker = (value: boolean) => value ? '/' : ''

export default defineEventHandler(async (event) => {
    const { createBaseRedmineHeader, TRACKER, versionShareType } = useRedmineAPI()
    const config = useRuntimeConfig(event)

    const url = `${config.public.redmineUrl}/issues.json`
    const baseUpdateUrl = `${config.public.redmineUrl}/issues/`

    const req = getRequestHeaders(event)
    const headers = createBaseRedmineHeader(req)

    const body = await readBody(event)
    const buildNetCommonRequest: BuildNetCommonRequest = body.BuildNetCommonRequest

    const validateAssigneeBelongToProject = (request: BuildNetCommonRequest) => {
        if (request.project.id !== request.assignTo.projectId) {
            throw createError({
                statusCode: 400,
                message: `Assignee ${request.assignTo.name} does not belong to the project ${request.project.name}`,
                statusMessage: `Assignee ${request.assignTo.name} does not belong to the project ${request.project.name}`,
            })
        }
    }

    const validateVersionBelongToProject = (request: BuildNetCommonRequest) => {
        if ((request.targetVerion.sharing === versionShareType.DESCENDANTS)
         || (request.targetVerion.sharing === versionShareType.HIERARCHY)
         || (request.targetVerion.sharing === versionShareType.TREE)) {
            return true;
        }

        if (request.project.id !== request.targetVerion.projectid) {
            throw createError({
                statusCode: 400,
                message: `Version ${request.targetVerion.name} does not belong to the project ${request.project.name}`,
                statusMessage: `Version ${request.targetVerion.name} does not belong to the project ${request.project.name}`,
            })
        }

        return true;
    }

    const updateDescRedmineId = async (description: string, redmineId: string) => {
        const updatedDescription = description.split("[BNZGENREDMINEID]").join(redmineId)
        const updateBody = {
            issue: {
                description: updatedDescription,
            }
        }

        const updateResponse = await axios.put(`${baseUpdateUrl}${redmineId}.json`, updateBody, { headers })
        if (updateResponse.status !== 204) {
            throw createError({
                statusCode: 500,
                message: `Update Redmine Id ${redmineId} failed`,
                statusMessage: `Update Redmine Id ${redmineId} failed`,
            })
        }

        return updatedDescription
    }

    const createBuildRequest = async (request: BuildNetCommonRequest) => {
        try {
            validateAssigneeBelongToProject(request)
            validateVersionBelongToProject(request)

            const description = await readTemplate('BuildNETCommonTemplate.textile')
            const replacedDescription = description
                .split("[BNZSELECTVERSION]").join(request.targetVerion.name)
                .split("[BNZISSUEAUTHOR]").join(request.assignTo.name)
                .split("[BNZEXE_TEST]").join(buildToggleMarker(request.options.executeTest))
                .split("[BNZEXE_SONAR]").join(buildToggleMarker(request.options.sonarAnalysis))
                .split("[BNZPUB_DC]").join(buildToggleMarker(request.options.publishDc))
                .split("[BNZPUB_DR]").join(buildToggleMarker(request.options.publishDr))
                .split("[BNZBUILDPURPOSE]").join(request.options.buildPurpose)

            const issueBody = {
                issue: {
                    project_id: request.project.id,
                    tracker_id: request.tracker_id,
                    status_id: 1,
                    priority_id: 3,
                    assigned_to_id: request.assignTo.id,
                    fixed_version_id: request.targetVerion.id,
                    subject: request.subject,
                    description: replacedDescription,
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

            const response = await axios.post(url, issueBody, { headers })
            const issueId = String(response?.data?.issue?.id)
            if (!issueId) {
            throw createError({
                statusCode: 500,
                message: 'Invalid response from Redmine when creating issue',
                statusMessage: 'Invalid response from Redmine when creating issue',
            })
            }

            await updateDescRedmineId(response.data.issue.description, issueId)
            return issueId
        } catch (err: unknown) {
            console.error('createBuildRequest failed:', err)
            // If error is already a createError-like object, rethrow it
            if ((err as any)?.statusCode) throw err
            throw createError({
            statusCode: 500,
            message: 'Failed to create build request',
            statusMessage: (err as Error)?.message ?? String(err),
            })
        }
    }

    if (buildNetCommonRequest.tracker_id !== TRACKER.BUILD_REQUEST) {
        throw createError({
            statusCode: 500,
            message: `Tracker ${buildNetCommonRequest.tracker_id} is not supported`,
            statusMessage: `Tracker ${buildNetCommonRequest.tracker_id} is not supported`,
        })
    }

    return await createBuildRequest(buildNetCommonRequest)
})