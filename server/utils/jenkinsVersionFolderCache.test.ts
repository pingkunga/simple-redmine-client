import fs from 'node:fs/promises'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  findJenkinsVersionFolderJob,
  readJenkinsVersionFolderCache,
  saveJenkinsVersionFolderJob
} from './jenkinsVersionFolderCache'

const cacheDirectory = `.data/jenkins-cache-test-${Date.now()}`

describe('jenkinsVersionFolderCache', () => {
  afterEach(async () => {
    await fs.rm(path.join(process.cwd(), cacheDirectory), { recursive: true, force: true })
    await fs.rm(path.join(process.cwd(), 'data', 'jenkins-cache'), { recursive: true, force: true })
    vi.unstubAllGlobals()
  })

  it('creates and updates a job in the JSON cache', async () => {
    vi.stubGlobal('useRuntimeConfig', () => ({
      jenkinsCacheDir: cacheDirectory
    }))

    const job: JenkinsVersionFolderJob = {
      jobId: 'job-1',
      versionName: '9.9.9.8',
      projectId: 858,
      cleanup: true,
      status: 'queued',
      queueId: 123,
      attempt: 1,
      createdAt: '2026-10-12T00:00:00.000Z',
      updatedAt: '2026-10-12T00:00:00.000Z'
    }

    await saveJenkinsVersionFolderJob(job)

    expect(await findJenkinsVersionFolderJob('job-1')).toEqual(job)
    expect((await readJenkinsVersionFolderCache()).jobs).toHaveLength(1)
  })
})
