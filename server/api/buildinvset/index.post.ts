import axios from 'axios'
import useRedmineAPI from '~/composables/useRedmineAPI'
import type { BuildInvSetRequest } from '~~/shared/types/BuildInvSet'
import { buildBuildInvSetPayloads } from '~~/server/utils/buildInvSetTemplateMapper'

const REQ_TIMEOUT = 120000 // 2 minutes
const getAxiosErrorMessage = (error: unknown, fallback: string) => {
  if (axios.isAxiosError(error)) {
    const responseMessage = error.response?.data?.error ?? error.response?.data?.message
    const detailMessage = error.response?.data?.errors?.[0]
    const message = responseMessage ?? detailMessage ?? error.message

    return `${fallback}: ${message}`
  }

  if (error instanceof Error) {
    return `${fallback}: ${error.message}`
  }

  return fallback
}

const applyParentId = (payload: Record<string, any>, parentIssueId: number | undefined) => {
  if (!payload?.issue || parentIssueId === undefined) {
    return payload
  }

  if (payload.issue.parent_issue_id === undefined || payload.issue.parent_issue_id === null || payload.issue.parent_issue_id === '') {
    payload.issue.parent_issue_id = parentIssueId
  }

  return payload
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const request = (body?.BuildInvSetRequest ?? body?.buildInvSetRequest ?? body) as BuildInvSetRequest

  console.log('[buildinvset] incoming request:', JSON.stringify(request, null, 2))

  if (!request) {
    throw createError({
      statusCode: 400,
      statusMessage: 'BuildInvSetRequest is required',
    })
  }

  const { createBaseRedmineHeader } = useRedmineAPI()
  const config = useRuntimeConfig(event)
  const req = getRequestHeaders(event)
  const headers = createBaseRedmineHeader(req)
  const url = `${config.public.redmineUrl}/issues.json`

  const payloads = await buildBuildInvSetPayloads(request)
  const createdIssues: Array<{ type: string; issueId: number }> = []

  const dotnetPayload = payloads.find((item) => item.type === 'dotnet')?.payload as Record<string, any> | undefined
  if (!dotnetPayload) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Dotnet build request payload is required',
    })
  }

  console.log('[buildinvset] dotnet payload:', JSON.stringify(dotnetPayload, null, 2))

  let dotnetIssueId: number | undefined
  try {
    const dotnetResponse = await axios.post(url, dotnetPayload, {
      headers,
      timeout: REQ_TIMEOUT,
    })
    dotnetIssueId = dotnetResponse?.data?.issue?.id
  } catch (error) {
    throw createError({
      statusCode: 422,
      statusMessage: getAxiosErrorMessage(error, 'Failed to create dotnet issue'),
    })
  }

  if (!dotnetIssueId) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to create dotnet issue',
    })
  }

  createdIssues.push({ type: 'dotnet', issueId: dotnetIssueId })
  console.log('[buildinvset] created dotnet issue id:', dotnetIssueId)

  for (const item of payloads.filter((payload) => payload.type !== 'dotnet')) {
    const payload = item.payload as Record<string, any>
    const payloadWithParent = applyParentId(payload, dotnetIssueId)

    console.log(`[buildinvset] ${item.type} payload:`, JSON.stringify(payloadWithParent, null, 2))

    let issueId: number | undefined
    try {
      const response = await axios.post(url, payloadWithParent, {
        headers,
        timeout: REQ_TIMEOUT,
      })
      issueId = response?.data?.issue?.id
    } catch (error) {
      throw createError({
        statusCode: 422,
        statusMessage: getAxiosErrorMessage(error, `Failed to create ${item.type} issue`),
      })
    }

    if (!issueId) {
      throw createError({
        statusCode: 500,
        statusMessage: `Failed to create ${item.type} issue`,
      })
    }

    createdIssues.push({ type: item.type, issueId })
    console.log(`[buildinvset] created ${item.type} issue id:`, issueId)
  }

  return {
    success: true,
    results: createdIssues,
  }
})
