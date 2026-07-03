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
  const candidates = [
    path.join(process.cwd(), 'public', 'Config', fileName),
    path.join(process.cwd(), 'public', 'IssueTemplate', fileName),
    path.join(process.cwd(), 'public', 'IssueTemplate', path.basename(fileName, '.json'), fileName),
  ]

  for (const filePath of candidates) {
    try {
      if (fs.existsSync(filePath)) {
        const fileContent = fs.readFileSync(filePath, 'utf-8')
        return JSON.parse(fileContent) as T
      }
    } catch (error) {
      console.error(`Error reading config file ${fileName} from ${filePath}:`, error)
    }
  }

  console.warn(`Config file not found: ${fileName}`)
  return null
}
