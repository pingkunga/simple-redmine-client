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
