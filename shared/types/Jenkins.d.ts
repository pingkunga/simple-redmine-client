export type JenkinsVersionFolderStatus =
  | 'pending'
  | 'queued'
  | 'running'
  | 'success'
  | 'failed'
  | 'timeout'

export interface JenkinsVersionFolderJob {
  jobId: string
  versionName: string
  projectId: number
  cleanup: boolean
  status: JenkinsVersionFolderStatus
  queueId?: number
  buildNumber?: number
  jenkinsUrl?: string
  error?: string
  attempt: number
  createdAt: string
  updatedAt: string
}

export interface JenkinsVersionFolderCache {
  jobs: JenkinsVersionFolderJob[]
}
