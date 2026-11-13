import { buildNextReleaseVersion, parseNextReleaseInput } from '../../../utils/nextReleaseVersion'

// Preview only (nothing is created). POST /api/release/next-release creates the Version for real.
export default defineEventHandler((event) => {
  const input = parseNextReleaseInput(getQuery(event))
  return buildNextReleaseVersion(input, useRuntimeConfig())
})
