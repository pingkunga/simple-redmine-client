import { z } from 'zod'
import { generateVersionNameV2 } from '../../../utils/versionNameV2'

const querySchema = z.object({
  major: z.coerce.number().int().min(1).max(99),
  minor: z.coerce.number().int().min(0).max(99).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  monthOffset: z.coerce.number().int().min(-24).max(24).optional(),
  projectId: z.coerce.number().int().positive().default(858),
  // Echoed as-is; POST /api/versions validates it (resolveScriptBranch / assertBranchExists)
  scriptBranch: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const parsed = querySchema.safeParse(getQuery(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid query', data: parsed.error.flatten().fieldErrors })
  }
  const { projectId, scriptBranch, minor, ...opts } = parsed.data

  // Defaults come from runtimeConfig (NUXT_VERSION_MINOR_DEFAULT, NUXT_VERSION_TIMEZONE); a bad default is a server error.
  const config = useRuntimeConfig()
  const defaultMinor = Number(config.versionMinorDefault)
  if (minor === undefined && !(Number.isInteger(defaultMinor) && defaultMinor >= 0 && defaultMinor <= 99)) {
    throw createError({ statusCode: 500, statusMessage: 'versionMinorDefault (NUXT_VERSION_MINOR_DEFAULT) must be an integer 0-99' })
  }

  try {
    const r = generateVersionNameV2({
      ...opts,
      minor: minor ?? defaultMinor,
      timeZone: String(config.versionTimezone || 'Asia/Bangkok'),
    })
    // Same field layout as the Versions screen (`Version`), ready to fill the form or POST /api/versions.
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
  } catch (e) {
    throw createError({ statusCode: 400, statusMessage: (e as Error).message })
  }
})
