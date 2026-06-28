import type { BuildInvSetRequest } from '~~/shared/types/BuildInvSet'
import type { Version, VersionWithReleaseNotes } from '~~/shared/types/Version'

export const clearThisWeekReleaseSelection = (formState: Pick<BuildInvSetRequest, 'targetVersion' | 'buildBranch'>) => {
  formState.targetVersion = undefined
  formState.buildBranch = ''
}

export const applyThisWeekReleaseSelection = (
  formState: Pick<BuildInvSetRequest, 'targetVersion' | 'buildBranch'>,
  release: VersionWithReleaseNotes | null | undefined,
) => {
  if (!release) {
    clearThisWeekReleaseSelection(formState)
    return
  }

  formState.targetVersion = release as Version
  formState.buildBranch = release.currentReleaseBranch || ''
}
