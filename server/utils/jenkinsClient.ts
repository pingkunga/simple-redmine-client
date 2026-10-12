import axios from 'axios'

interface JenkinsQueueResponse {
  cancelled?: boolean
  executable?: {
    number: number
  }
  why?: string
}

interface JenkinsBuildResponse {
  building: boolean
  result: string | null
  number: number
}

const getJenkinsConfig = () => {
  const config = useRuntimeConfig()

  if (!config.jenkinsUrl || !config.jenkinsUser || !config.jenkinsToken) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Jenkins integration is not configured'
    })
  }

  return {
    baseUrl: config.jenkinsUrl.replace(/\/+$/, ''),
    jobName: config.jenkinsJob,
    auth: {
      username: config.jenkinsUser,
      password: config.jenkinsToken
    }
  }
}

const getJenkinsHeaders = () => ({
  Accept: 'application/json'
})

export const triggerJenkinsVersionFolder = async (versionName: string, cleanup: boolean) => {
  const config = getJenkinsConfig()
  const params = new URLSearchParams({
    VERSION_NAME: versionName,
    CLEANUP: String(cleanup)
  })

  const response = await axios.post(
    `${config.baseUrl}/job/${encodeURIComponent(config.jobName)}/buildWithParameters`,
    params.toString(),
    {
      auth: config.auth,
      headers: {
        ...getJenkinsHeaders(),
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      validateStatus: status => status >= 200 && status < 300
    }
  )

  const location = response.headers.location
  const queueMatch = typeof location === 'string'
    ? location.match(/\/queue\/item\/(\d+)\/?/)
    : null

  if (!queueMatch) {
    throw createError({
      statusCode: 502,
      statusMessage: 'Jenkins did not return a queue location'
    })
  }

  return {
    queueId: Number(queueMatch[1])
  }
}

export const getJenkinsQueueStatus = async (queueId: number) => {
  const config = getJenkinsConfig()
  const response = await axios.get<JenkinsQueueResponse>(
    `${config.baseUrl}/queue/item/${queueId}/api/json`,
    {
      auth: config.auth,
      headers: getJenkinsHeaders()
    }
  )

  if (response.data.cancelled) {
    return { status: 'failed' as const, error: 'Jenkins queue item was cancelled' }
  }

  if (!response.data.executable) {
    return { status: 'queued' as const, message: response.data.why }
  }

  return {
    status: 'running' as const,
    buildNumber: response.data.executable.number
  }
}

export const getJenkinsBuildStatus = async (buildNumber: number) => {
  const config = getJenkinsConfig()
  const response = await axios.get<JenkinsBuildResponse>(
    `${config.baseUrl}/job/${encodeURIComponent(config.jobName)}/${buildNumber}/api/json`,
    {
      auth: config.auth,
      headers: getJenkinsHeaders()
    }
  )

  if (response.data.building) {
    return { status: 'running' as const }
  }

  if (response.data.result === 'SUCCESS') {
    return {
      status: 'success' as const,
      buildNumber: response.data.number
    }
  }

  return {
    status: 'failed' as const,
    buildNumber: response.data.number,
    error: `Jenkins build finished with result ${response.data.result || 'UNKNOWN'}`
  }
}

export const getJenkinsBuildUrl = (buildNumber: number) => {
  const config = getJenkinsConfig()
  return `${config.baseUrl}/job/${encodeURIComponent(config.jobName)}/${buildNumber}/`
}
