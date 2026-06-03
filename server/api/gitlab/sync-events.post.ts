export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const projectId = String(body?.projectId || '')
  const after = String(body?.after || '')
  const before = String(body?.before || '')

  if (!projectId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Project ID is required',
    })
  }

  if (!after || !before) {
    throw createError({
      statusCode: 400,
      statusMessage: 'After and before dates are required',
    })
  }

  try {
    return await syncProjectEvents(projectId, after, before)
  } catch (error: any) {
    console.error('GitLab Sync Error:', error.response?.data || error.message)
    throw createError({
      statusCode: error.response?.status || 500,
      statusMessage: 'Failed to sync GitLab events',
    })
  }
})
