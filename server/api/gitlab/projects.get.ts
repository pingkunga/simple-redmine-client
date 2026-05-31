import fs from 'fs'
import path from 'path'
import type { GitLabProject } from '~~/shared/types/GitLab'

export default defineEventHandler(async (event) => {
  try {
    const filePath = path.join(process.cwd(), 'public', 'Config', 'SupportGitLabProject.json')
    if (!fs.existsSync(filePath)) {
        return []
    }
    const fileContent = fs.readFileSync(filePath, 'utf-8')
    const projects: GitLabProject[] = JSON.parse(fileContent)
    return projects
  } catch (error) {
    console.error('Error reading SupportGitLabProject.json:', error)
    return []
  }
})
