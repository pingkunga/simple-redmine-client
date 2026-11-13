import axios from 'axios'
import { z } from 'zod'
import { buildNextReleaseVersion, nextReleaseInputSchema, parseNextReleaseInput } from '../../utils/nextReleaseVersion'
import { createRedmineVersion } from '../../utils/versionCreate'
import { startVersionFolderJob } from '../../utils/jenkinsVersionFolderJob'

const bodySchema = nextReleaseInputSchema.extend({
  createJenkinsFolder: z.boolean().default(true),
  cleanup: z.boolean().default(true),
})

/**
 * Creates the next release Version for real, the same steps as Save on the Versions screen:
 * Redmine Version (+ Script Branch) then, when createJenkinsFolder, the Jenkins Version Folder job.
 * Guarded by server/middleware/auth.ts like every /api/release/* route.
 * Preview without creating: GET /api/v2/versions/next-release.
 */
export default defineEventHandler(async (event) => {
  const { createJenkinsFolder, cleanup, ...input } = parseNextReleaseInput(await readBody(event), bodySchema)
  const config = useRuntimeConfig(event)
  const { meta, ...next } = buildNextReleaseVersion(input, config)

  let created: Awaited<ReturnType<typeof createRedmineVersion>>
  try {
    created = await createRedmineVersion({
      redmineUrl: config.public.redmineUrl,
      redmineToken: config.redmineToken,
      projectId: input.projectId,
      version: next,
      // '' = default branch; undefined = no Jenkins folder, so no branch is stored
      scriptBranch: createJenkinsFolder ? (input.scriptBranch ?? '') : undefined,
    })
  } catch (error) {
    // Redmine answers 422 with { errors: [...] }, e.g. "Name has already been taken"
    if (axios.isAxiosError(error) && error.response) {
      const errors = (error.response.data as { errors?: string[] } | undefined)?.errors
      throw createError({
        statusCode: error.response.status,
        statusMessage: errors?.join(', ') || `Redmine rejected version ${next.name}`,
        data: { name: next.name, errors },
      })
    }
    throw error
  }

  const version = created.data?.version
  let jenkins = null
  if (createJenkinsFolder && created.scriptBranch) {
    try {
      jenkins = await startVersionFolderJob({
        versionName: next.name,
        projectId: input.projectId,
        cleanup,
        scriptBranch: created.scriptBranch,
      })
    } catch (error) {
      // The Version already exists in Redmine; report it so the caller retries Jenkins only.
      console.error('Version saved, Jenkins failed:', error)
      throw createError({
        statusCode: 502,
        statusMessage: `Version ${next.name} saved, Jenkins failed`,
        data: { version, jenkinsError: error instanceof Error ? error.message : String(error) },
      })
    }
  }

  return { version, preview: meta, jenkins }
})
