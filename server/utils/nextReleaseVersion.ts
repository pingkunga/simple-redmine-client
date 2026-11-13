import { z } from 'zod'
import { createError } from 'h3'
import { generateVersionNameV2 } from './versionNameV2'
import { DEFAULT_RELEASE_PROJECT_ID } from './releaseService'

export const nextReleaseInputSchema = z.object({
  major: z.coerce.number().int().min(1).max(99),
  minor: z.coerce.number().int().min(0).max(99).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  monthOffset: z.coerce.number().int().min(-24).max(24).optional(),
  projectId: z.coerce.number().int().positive().default(DEFAULT_RELEASE_PROJECT_ID),
  // Echoed as-is; the create path validates it (resolveScriptBranch / assertBranchExists)
  scriptBranch: z.string().optional(),
})

export type NextReleaseInput = z.infer<typeof nextReleaseInputSchema>

export interface NextReleaseConfig {
  versionMinorDefault?: unknown
  versionTimezone?: unknown
  /** For tests; defaults to the current time */
  now?: Date
}

/** Validates raw query/body input; a bad input is a 400 with zod's field errors. */
export const parseNextReleaseInput = <T extends z.ZodTypeAny = typeof nextReleaseInputSchema>(
  raw: unknown,
  schema: T = nextReleaseInputSchema as unknown as T,
): z.infer<T> => {
  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid input', data: parsed.error.flatten().fieldErrors })
  }
  return parsed.data
}

/**
 * Next release version in the Versions screen's `Version` layout, ready to fill the form or POST /api/versions.
 * Defaults come from runtimeConfig (NUXT_VERSION_MINOR_DEFAULT, NUXT_VERSION_TIMEZONE); a bad default is a server error.
 */
export const buildNextReleaseVersion = (input: NextReleaseInput, config: NextReleaseConfig) => {
  const { projectId, scriptBranch, minor, ...opts } = input

  const defaultMinor = Number(config.versionMinorDefault)
  if (minor === undefined && !(Number.isInteger(defaultMinor) && defaultMinor >= 0 && defaultMinor <= 99)) {
    throw createError({ statusCode: 500, statusMessage: 'versionMinorDefault (NUXT_VERSION_MINOR_DEFAULT) must be an integer 0-99' })
  }

  let r: ReturnType<typeof generateVersionNameV2>
  try {
    r = generateVersionNameV2({
      ...opts,
      minor: minor ?? defaultMinor,
      now: config.now,
      timeZone: String(config.versionTimezone || 'Asia/Bangkok'),
    })
  } catch (e) {
    throw createError({ statusCode: 400, statusMessage: (e as Error).message })
  }

  return {
    id: -1,
    name: r.name,
    versionName: '',
    description: r.description,
    status: 'open',
    sharing: 'tree',
    due_date: r.dueDate,
    projectid: projectId,
    projectname: '',
    wiki_page_title: '',
    created_on: '',
    updated_on: '',
    scriptBranch: scriptBranch ?? '', // '' = default branch
    meta: {
      major: r.major, minor: r.minor, yymm: r.yymm, week: r.week,
      isLastOfMonth: r.isLastOfMonth, createJenkinsFolder: true,
      weekStart: r.weekStart, friday: r.friday, baseDate: r.baseDate, targetDate: r.targetDate,
    },
  }
}
