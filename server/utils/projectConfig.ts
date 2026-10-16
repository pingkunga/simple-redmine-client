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

export interface SupportTracker {
  id: number
  name: string
  purpose?: string
}

export interface SupportGitLabProject {
  id: number
  name: string
}

const readAllowlist = <T extends { id: number }>(fileName: string): T[] => {
  const list = readConfigJson<T[]>(fileName)
  return Array.isArray(list) ? list : []
}

export const getSupportTrackers = (): SupportTracker[] => readAllowlist<SupportTracker>('SupportTracker.json')

export const getSupportGitLabProjects = (): SupportGitLabProject[] =>
  readAllowlist<SupportGitLabProject>('SupportGitLabProject.json')

/**
 * Fail-closed guard: an empty or unreadable allowlist rejects everything instead of
 * silently allowing anything, which is the failure mode that matters (e.g. wrong cwd).
 */
const assertInAllowlist = (kind: string, allowlist: { id: number }[], id: unknown): void => {
  if (allowlist.length === 0) {
    throw new Error(`${kind} allowlist is empty or unreadable; refusing all ${kind} ids`)
  }
  const numericId = Number(id)
  if (!Number.isInteger(numericId) || !allowlist.some(item => item.id === numericId)) {
    throw new Error(`${kind} ${String(id)} is not in the supported list`)
  }
}

export const assertProjectSupported = (projectId: unknown): void =>
  assertInAllowlist('Project', getSupportProjects(), projectId)

export const assertTrackerSupported = (trackerId: unknown): void =>
  assertInAllowlist('Tracker', getSupportTrackers(), trackerId)

export const assertGitLabProjectSupported = (gitlabProjectId: unknown): void =>
  assertInAllowlist('GitLab project', getSupportGitLabProjects(), gitlabProjectId)
