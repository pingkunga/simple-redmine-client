import type { BuildInvSetRequest } from '~/shared/types/BuildInvSet'

export default function useBuildInvSetAPI() {
  const submitBuildInvSet = async (request: BuildInvSetRequest) => {
    const { data, error } = await useFetch('/api/buildinvset', {
      method: 'POST',
      body: JSON.stringify({ BuildInvSetRequest: request }),
    })

    if (error.value) {
      throw createError({
        statusCode: error.value.statusCode ?? 500,
        statusMessage: error.value.statusMessage ?? 'Failed to submit Build InvSet request',
      })
    }

    return data.value
  }

  return {
    submitBuildInvSet,
  }
}
