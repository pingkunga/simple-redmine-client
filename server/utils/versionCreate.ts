import axios from 'axios'
import { assertBranchExists, resolveScriptBranch } from './scriptBranch'
import { setScriptBranch } from './versionScriptBranchStore'

export interface CreateRedmineVersionParams {
  redmineUrl: string
  redmineToken: string
  projectId: number
  version: Pick<Version, 'name' | 'status' | 'sharing' | 'due_date' | 'description'>
  /** undefined = no Jenkins Version Folder, so no branch is validated or stored; '' = default branch */
  scriptBranch?: unknown
}

/**
 * POST /projects/{id}/versions.json, the same steps as the Versions screen's Save.
 * Returns Redmine's response body ({ version }) and the resolved Script Branch.
 */
export const createRedmineVersion = async (params: CreateRedmineVersionParams) => {
  const url = `${params.redmineUrl}/projects/${params.projectId}/versions.json`
  const headers = {
    'Content-Type': 'application/json',
    'X-Redmine-API-Key': params.redmineToken
  }

  // Script Branch is sent only when the Jenkins Version Folder is requested. Validate it before Redmine is
  // touched so a bad branch name does not leave a half-created Version behind.
  const scriptBranch = params.scriptBranch === undefined ? undefined : resolveScriptBranch(params.scriptBranch)
  if (scriptBranch) {
    await assertBranchExists(scriptBranch)
  }

  const { name, status, sharing, due_date, description } = params.version
  const response = await axios.post(url, { version: { name, status, sharing, due_date, description } }, { headers })
  if (scriptBranch && response.data?.version?.id) {
    // The Version already exists in Redmine, so a failed write must not turn this into a failed save.
    await setScriptBranch(response.data.version.id, scriptBranch)
      .catch(err => console.error('Error saving Script Branch:', err))
  }
  return { data: response.data, scriptBranch }
}
