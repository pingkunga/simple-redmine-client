import axios from 'axios'
import type { GitLabBranch, GitLabEvent } from '~~/shared/types/GitLab'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const projectId = query.projectId as string

  if (!projectId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Project ID is required',
    })
  }

  try {
    // Use the cache utility to handle hybrid data fetching
    return await getGitLabBranches(projectId)
  } catch (error: any) {
    console.error('GitLab API Error:', error.response?.data || error.message)
    throw createError({
      statusCode: error.response?.status || 500,
      statusMessage: 'Failed to fetch GitLab branches',
    })
  }
})
