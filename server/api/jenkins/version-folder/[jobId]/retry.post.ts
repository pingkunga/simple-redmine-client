import { triggerJenkinsVersionFolder } from '../../../../utils/jenkinsClient'
import {
  findJenkinsVersionFolderJob,
  saveJenkinsVersionFolderJob
} from '../../../../utils/jenkinsVersionFolderCache'

export default defineEventHandler(async (event) => {
  const jobId = getRouterParam(event, 'jobId')

  if (!jobId) {
    throw createError({ statusCode: 400, statusMessage: 'jobId is required' })
  }

  const job = await findJenkinsVersionFolderJob(jobId)
  if (!job) {
    throw createError({ statusCode: 404, statusMessage: 'Jenkins job was not found' })
  }

  if (!['failed', 'timeout'].includes(job.status)) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Only failed or timed out Jenkins jobs can be retried'
    })
  }

  try {
    const result = await triggerJenkinsVersionFolder(job.versionName, job.cleanup)
    const retriedJob: JenkinsVersionFolderJob = {
      ...job,
      status: 'queued',
      queueId: result.queueId,
      buildNumber: undefined,
      jenkinsUrl: undefined,
      error: undefined,
      attempt: job.attempt + 1,
      updatedAt: new Date().toISOString()
    }

    await saveJenkinsVersionFolderJob(retriedJob)
    return retriedJob
  } catch (error) {
    job.status = 'failed'
    job.error = error instanceof Error ? error.message : 'Unable to retry Jenkins'
    job.updatedAt = new Date().toISOString()
    await saveJenkinsVersionFolderJob(job)
    throw error
  }
})
