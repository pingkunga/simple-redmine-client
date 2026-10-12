import { triggerJenkinsVersionFolder } from '../../utils/jenkinsClient'
import { saveJenkinsVersionFolderJob } from '../../utils/jenkinsVersionFolderCache'
import { randomUUID } from 'node:crypto'

interface TriggerRequest {
  versionName?: string
  projectId?: number
  cleanup?: boolean
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

  const now = new Date().toISOString()
  const job: JenkinsVersionFolderJob = {
    jobId: randomUUID(),
    versionName,
    projectId,
    cleanup,
    status: 'pending',
    attempt: 1,
    createdAt: now,
    updatedAt: now
  }

  await saveJenkinsVersionFolderJob(job)

  try {
    const result = await triggerJenkinsVersionFolder(versionName, cleanup)
    job.status = 'queued'
    job.queueId = result.queueId
    job.updatedAt = new Date().toISOString()
    await saveJenkinsVersionFolderJob(job)

    return {
      jobId: job.jobId,
      status: job.status,
      queueId: job.queueId
    }
  } catch (error) {
    job.status = 'failed'
    job.error = error instanceof Error ? error.message : 'Unable to trigger Jenkins'
    job.updatedAt = new Date().toISOString()
    await saveJenkinsVersionFolderJob(job)
    throw error
  }
})
