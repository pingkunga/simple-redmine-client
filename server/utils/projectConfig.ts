import fs from 'fs'
import path from 'path'

export interface SupportProject {
  id: number
  name: string
}

export const getSupportProjects = (): SupportProject[] => {
  try {
    const filePath = path.join(process.cwd(), 'public', 'Config', 'SupportProject.json')
    const fileContent = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(fileContent)
  } catch (error) {
    console.error('Error reading SupportProject.json:', error)
    return []
  }
}

export const readConfigJson = <T>(fileName: string): T | null => {
  try {
    const filePath = path.join(process.cwd(), 'public', 'Config', fileName)
    if (!fs.existsSync(filePath)) {
      console.warn(`Config file not found: ${filePath}`)
      return null
    }
    const fileContent = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(fileContent) as T
  } catch (error) {
    console.error(`Error reading config file ${fileName}:`, error)
    return null
  }
}
