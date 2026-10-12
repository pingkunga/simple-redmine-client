import type {
  JenkinsVersionFolderJob,
  JenkinsVersionFolderStatus
} from '~~/shared/types/Jenkins'

export const useJenkinsVersionFolder = () => {
  const trigger = async (versionName: string, projectId: number, cleanup: boolean) => {
    const { data, error } = await useFetch<{
      jobId: string
      status: JenkinsVersionFolderStatus
      queueId: number
    }>('/api/jenkins/version-folder', {
      method: 'POST',
      body: {
        versionName,
        projectId,
        cleanup
      }
    })

    if (error.value) {
      throw createError({
        statusCode: error.value.statusCode,
        statusMessage: error.value.statusMessage || 'Unable to trigger Jenkins'
      })
    }

    if (!data.value) {
      throw new Error('Jenkins did not return a job')
    }

    return data.value
  }

  const getStatus = async (jobId: string) => {
    const { data, error } = await useFetch<JenkinsVersionFolderJob>(
      `/api/jenkins/version-folder/${encodeURIComponent(jobId)}`,
      { query: { t: Date.now() } }
    )

    if (error.value) {
      throw createError({
        statusCode: error.value.statusCode,
        statusMessage: error.value.statusMessage || 'Unable to read Jenkins status'
      })
    }

    if (!data.value) {
      throw new Error('Jenkins status was empty')
    }

    return data.value
  }

  const retry = async (jobId: string) => {
    const { data, error } = await useFetch<JenkinsVersionFolderJob>(
      `/api/jenkins/version-folder/${encodeURIComponent(jobId)}/retry`,
      { method: 'POST' }
    )

    if (error.value) {
      throw createError({
        statusCode: error.value.statusCode,
        statusMessage: error.value.statusMessage || 'Unable to retry Jenkins'
      })
    }

    if (!data.value) {
      throw new Error('Jenkins retry response was empty')
    }

    return data.value
  }

  return {
    trigger,
    getStatus,
    retry
  }
}
