export default defineEventHandler(async (event) => {
  const name = getRouterParam(event, 'name')
  if (!name || !name.endsWith('.json')) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid config name'
    })
  }

  const config = readConfigJson<any>(name)
  if (!config) {
    throw createError({
      statusCode: 404,
      statusMessage: `Config ${name} not found`
    })
  }

  return config
})
