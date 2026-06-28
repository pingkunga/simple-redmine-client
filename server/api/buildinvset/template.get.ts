import { promises as fs } from 'fs'
import path from 'path'
import { existsSync } from 'fs'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const layout = query.layout as string

  if (!layout) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Layout is required',
    })
  }

  const filePath = path.join(process.cwd(), 'public', 'IssueTemplate', 'buildinvset', layout, 'build_parameters.json')

  if (!existsSync(filePath)) {
    return null
  }

  try {
    const content = await fs.readFile(filePath, 'utf-8')
    const config = JSON.parse(content)
    
    // Ensure trackerId is handled as a number
    if (config.trackerId) {
      config.trackerId = Number(config.trackerId)
    }
    
    return config
  } catch (error) {
    console.error('[template.get] Error reading template:', error)
    return null
  }
})
