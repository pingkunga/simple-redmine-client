import { startVersionFolderJob } from '../../utils/jenkinsVersionFolderJob'
import { assertBranchExists, resolveScriptBranch } from '../../utils/scriptBranch'

interface TriggerRequest {
  versionName?: string
  projectId?: number
  cleanup?: boolean
  scriptBranch?: string
}

export default defineEventHandler(async (event) => {
  const body = await readBody<TriggerRequest>(event)
  const versionName = typeof body?.versionName === 'string' ? body.versionName.trim() : ''
  const projectId = Number(body?.projectId)
  const cleanup = body?.cleanup !== false

  if (!versionName || !Number.isInteger(projectId) || projectId <= 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'versionName and a valid projectId are required'
    })
  }

  const scriptBranch = resolveScriptBranch(body?.scriptBranch)
  await assertBranchExists(scriptBranch)

  return await startVersionFolderJob({ versionName, projectId, cleanup, scriptBranch })
})
