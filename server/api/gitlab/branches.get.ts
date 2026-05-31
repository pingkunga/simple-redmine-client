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

  const config = useRuntimeConfig()
  const gitlabUrl = config.public.gitlabUrl
  const gitlabToken = config.gitlabToken

  const headers = {
    'PRIVATE-TOKEN': gitlabToken,
  }

  try {
    // 1. Fetch Branches
    const branchesResponse = await axios.get<GitLabBranch[]>(
      `${gitlabUrl}/api/v4/projects/${projectId}/repository/branches`,
      { headers }
    )
    const branches = branchesResponse.data

    // 2. Fetch Push Events (to find creators)
    const eventsResponse = await axios.get<GitLabEvent[]>(
      `${gitlabUrl}/api/v4/projects/${projectId}/events`,
      { 
        headers,
        params: { action: 'pushed', per_page: 100 } 
      }
    )
    const events = eventsResponse.data

    // 3. Filter branch creation events
    const branchCreations = events.filter(e => 
      e.push_data?.action === "created" && 
      e.push_data?.ref_type === "branch"
    )

    // 4. Merge data
    const mergedBranches = branches.map(branch => {
      const creationEvent = branchCreations.find(e => e.push_data?.ref === branch.name)
      
      return {
        ...branch,
        creator_name: creationEvent ? creationEvent.author.name : branch.commit.author_name,
        created_at: creationEvent ? creationEvent.created_at : branch.commit.created_at || branch.commit.authored_date,
        is_direct: !!creationEvent
      }
    })

    return mergedBranches
  } catch (error: any) {
    console.error('Error fetching GitLab data:', error.response?.data || error.message)
    throw createError({
      statusCode: error.response?.status || 500,
      statusMessage: `GitLab API Error: ${error.message}`,
    })
  }
})
