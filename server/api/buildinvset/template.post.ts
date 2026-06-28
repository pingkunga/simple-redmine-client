import fs from 'fs/promises'
import path from 'path'
import { existsSync } from 'fs'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { layout, ...config } = body

  if (!layout) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Layout is required',
    })
  }

  // Ensure trackerId is a number
  if (config.trackerId) {
    config.trackerId = Number(config.trackerId)
  }

  // Remove UI state from persisted template
  delete config.saveAsTemplate

  const dirPath = path.join(process.cwd(), 'public', 'IssueTemplate', 'buildinvset', layout)
  
  try {
    if (!existsSync(dirPath)) {
      await fs.mkdir(dirPath, { recursive: true })
    }

    const filePath = path.join(dirPath, 'build_parameters.json')
    await fs.writeFile(filePath, JSON.stringify(config, null, 2), 'utf-8')
    
    return { success: true }
  } catch (error: any) {
    console.error('[template.post] Failed to save template:', error)
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to save template: ${error.message}`,
    })
  }
})
