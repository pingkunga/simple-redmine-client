import fs from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'

const cacheFileName = 'version-folder-jobs.json'

const getCacheFilePath = () => {
  const config = useRuntimeConfig()
  return path.join(process.cwd(), config.jenkinsCacheDir, cacheFileName)
}

const emptyCache = (): JenkinsVersionFolderCache => ({ jobs: [] })

export const readJenkinsVersionFolderCache = async (): Promise<JenkinsVersionFolderCache> => {
  const filePath = getCacheFilePath()

  try {
    const content = await fs.readFile(filePath, 'utf8')
    const parsed = JSON.parse(content) as Partial<JenkinsVersionFolderCache>
    return {
      jobs: Array.isArray(parsed.jobs) ? parsed.jobs : []
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return emptyCache()
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Unable to read Jenkins job cache'
    })
  }
}

export const writeJenkinsVersionFolderCache = async (cache: JenkinsVersionFolderCache) => {
  const filePath = getCacheFilePath()
  const tempFilePath = `${filePath}.${randomUUID()}.tmp`

  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(tempFilePath, JSON.stringify(cache, null, 2), 'utf8')

  try {
    await fs.rename(tempFilePath, filePath)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
      throw error
    }

    await fs.rm(filePath, { force: true })
    await fs.rename(tempFilePath, filePath)
  }
}

export const findJenkinsVersionFolderJob = async (jobId: string) => {
  const cache = await readJenkinsVersionFolderCache()
  return cache.jobs.find(job => job.jobId === jobId)
}

export const saveJenkinsVersionFolderJob = async (job: JenkinsVersionFolderJob) => {
  const cache = await readJenkinsVersionFolderCache()
  const index = cache.jobs.findIndex(item => item.jobId === job.jobId)

  if (index === -1) {
    cache.jobs.push(job)
  } else {
    cache.jobs[index] = job
  }

  await writeJenkinsVersionFolderCache(cache)
  return job
}
