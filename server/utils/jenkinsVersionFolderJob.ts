import { randomUUID } from 'node:crypto'
import { triggerJenkinsVersionFolder } from './jenkinsClient'
import { saveJenkinsVersionFolderJob } from './jenkinsVersionFolderCache'

export interface StartVersionFolderJobParams {
  versionName: string
  projectId: number
  cleanup: boolean
  /** Already resolved and checked (resolveScriptBranch / assertBranchExists) */
  scriptBranch: string
}

/** Records a job in the cache, then triggers the Jenkins Version Folder build. Poll via GET /api/jenkins/version-folder/{jobId}. */
export const startVersionFolderJob = async (params: StartVersionFolderJobParams) => {
  const now = new Date().toISOString()
  const job: JenkinsVersionFolderJob = {
    jobId: randomUUID(),
    versionName: params.versionName,
    projectId: params.projectId,
    cleanup: params.cleanup,
    scriptBranch: params.scriptBranch,
    status: 'pending',
    attempt: 1,
    createdAt: now,
    updatedAt: now
  }

  await saveJenkinsVersionFolderJob(job)

  try {
    const result = await triggerJenkinsVersionFolder(params.versionName, params.cleanup, params.scriptBranch)
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
}
