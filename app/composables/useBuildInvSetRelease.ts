import type { BuildInvSetRequest } from '~~/shared/types/BuildInvSet'
import type { Version, VersionWithReleaseNotes } from '~~/shared/types/Version'

const formatDateInput = (date: Date) => date.toISOString().split('T')[0]

const getDefaultDateRange = () => {
  const today = new Date()
  return {
    startDate: formatDateInput(today),
    endDate: formatDateInput(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 4)),
  }
}

export const clearThisWeekReleaseSelection = (formState: Pick<BuildInvSetRequest, 'targetVersion' | 'buildBranch' | 'startDate' | 'endDate'>) => {
  formState.targetVersion = undefined
  formState.buildBranch = ''
  const { startDate, endDate } = getDefaultDateRange()
  formState.startDate = startDate
  formState.endDate = endDate
}

export const applyThisWeekReleaseSelection = (
  formState: Pick<BuildInvSetRequest, 'targetVersion' | 'buildBranch' | 'startDate' | 'endDate'>,
  release: VersionWithReleaseNotes | null | undefined,
) => {
  if (!release) {
    clearThisWeekReleaseSelection(formState)
    return
  }

  const releaseDate = release.due_date ? new Date(release.due_date) : new Date()
  const startDate = formatDateInput(releaseDate)
  const endDate = formatDateInput(new Date(releaseDate.getFullYear(), releaseDate.getMonth(), releaseDate.getDate() + 4))

  formState.targetVersion = release as Version
  formState.buildBranch = release.currentReleaseBranch || ''
  formState.startDate = startDate
  formState.endDate = endDate
}
