import {
  getJenkinsBuildStatus,
  getJenkinsBuildUrl,
  getJenkinsQueueStatus
} from '../../../utils/jenkinsClient'
import {
  findJenkinsVersionFolderJob,
  saveJenkinsVersionFolderJob
} from '../../../utils/jenkinsVersionFolderCache'

export default defineEventHandler(async (event) => {
  const jobId = getRouterParam(event, 'jobId')

  if (!jobId) {
    throw createError({ statusCode: 400, statusMessage: 'jobId is required' })
  }

  const job = await findJenkinsVersionFolderJob(jobId)
  if (!job) {
    throw createError({ statusCode: 404, statusMessage: 'Jenkins job was not found' })
  }

  if (
    ['queued', 'running'].includes(job.status) &&
    Date.now() - new Date(job.updatedAt).getTime() > 3 * 60 * 1000
  ) {
    job.status = 'timeout'
    job.error = 'Jenkins job timed out after 3 minutes'
    job.updatedAt = new Date().toISOString()
    await saveJenkinsVersionFolderJob(job)
    return job
  }

  if (job.status === 'queued' && job.queueId) {
    const queueStatus = await getJenkinsQueueStatus(job.queueId)

    if (queueStatus.status === 'failed') {
      job.status = 'failed'
      job.error = queueStatus.error
    } else if (queueStatus.status === 'running') {
      job.status = 'running'
      job.buildNumber = queueStatus.buildNumber
    }

    job.updatedAt = new Date().toISOString()
    await saveJenkinsVersionFolderJob(job)
  }

  if (job.status === 'running' && job.buildNumber) {
    const buildStatus = await getJenkinsBuildStatus(job.buildNumber)
    job.status = buildStatus.status
    job.error = buildStatus.error
    job.jenkinsUrl = getJenkinsBuildUrl(job.buildNumber)
    job.updatedAt = new Date().toISOString()
    await saveJenkinsVersionFolderJob(job)
  }

  return job
})
