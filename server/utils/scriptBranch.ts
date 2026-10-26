import axios from 'axios'

// Same character set as the BRANCH_NAME check in the Jenkins job, but stricter: the value ends up in
// `git checkout` / `git push`, so no leading '-' (option injection) and no '..'.
const BRANCH_PATTERN = /^[A-Za-z0-9._/-]+$/
const MAX_BRANCH_LENGTH = 200
const GITLAB_TIMEOUT_MS = 10_000

const invalidBranch = (message: string) => createError({
  statusCode: 400,
  statusMessage: message
})

/** Trims the input, falls back to `defaultBranch` when empty and rejects names Jenkins/git should never see. */
export const normalizeScriptBranch = (input: unknown, defaultBranch: string): string => {
  if (input !== undefined && input !== null && typeof input !== 'string') {
    throw invalidBranch('Script Branch must be a string')
  }

  const branch = (typeof input === 'string' ? input.trim() : '') || defaultBranch.trim()

  if (!branch) {
    throw invalidBranch('Script Branch is empty and no default branch is configured')
  }

  if (
    branch.length > MAX_BRANCH_LENGTH
    || !BRANCH_PATTERN.test(branch)
    || branch.startsWith('-')
    || branch.includes('..')
  ) {
    throw invalidBranch('Script Branch is invalid (use letters, digits, ".", "_", "/" and "-" only)')
  }

  return branch
}

/** Resolves the branch the same way for every caller: the typed value, else the configured default. */
export const resolveScriptBranch = (input: unknown): string => {
  const config = useRuntimeConfig()
  return normalizeScriptBranch(input, String(config.jenkinsDefaultScriptBranch || ''))
}

/**
 * Checks the branch against GitLab (JENKINS_SCRIPT_REPO = numeric id or path). Skipped when the repo is not
 * configured. Calls GitLab directly instead of the branch cache, which can miss a branch created minutes ago.
 */
export const assertBranchExists = async (branch: string) => {
  const config = useRuntimeConfig()
  const repo = String(config.jenkinsScriptRepo || '').trim()
  if (!repo) return

  const gitlabUrl = String(config.public.gitlabUrl || '').replace(/\/+$/, '')
  const url = `${gitlabUrl}/api/v4/projects/${encodeURIComponent(repo)}/repository/branches/${encodeURIComponent(branch)}`

  try {
    await axios.get(url, {
      headers: { 'PRIVATE-TOKEN': String(config.gitlabToken || '') },
      timeout: GITLAB_TIMEOUT_MS
    })
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      // GitLab answers 404 for a missing branch ("404 Branch Not Found") and for a missing project / no access.
      const message = String((error.response.data as { message?: unknown } | undefined)?.message ?? '')
      if (/branch/i.test(message)) {
        throw invalidBranch(`Branch '${branch}' was not found in ${repo}`)
      }
      throw createError({
        statusCode: 502,
        statusMessage: `GitLab repository '${repo}' was not found (or the token cannot read it)`
      })
    }

    throw createError({
      statusCode: 502,
      statusMessage: 'Unable to verify the Script Branch in GitLab'
    })
  }
}
