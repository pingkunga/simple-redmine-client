import { z } from 'zod'
import { generateVersionName } from '../../utils/versionName'

const querySchema = z.object({
  major: z.coerce.number().int().min(1).max(99),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  monthOffset: z.coerce.number().int().min(0).max(24).optional(),
  weekStartsOn: z.coerce.number().int().min(0).max(6).optional(),
  projectId: z.coerce.number().int().positive().default(858),
  // Echoed as-is; POST /api/versions validates it (resolveScriptBranch / assertBranchExists)
  scriptBranch: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const parsed = querySchema.safeParse(getQuery(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid query', data: parsed.error.flatten().fieldErrors })
  }
  const { projectId, scriptBranch, ...opts } = parsed.data
  try {
    const r = generateVersionName({ ...opts, weekStartsOn: opts.weekStartsOn as 0 | 1 | 2 | 3 | 4 | 5 | 6 | undefined })
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
        major: r.major, year: r.year, month: r.month, week: r.week,
        isLastOfMonth: r.isLastOfMonth, createJenkinsFolder: true, baseDate: r.baseDate, targetDate: r.targetDate,
      },
    }
  } catch (e) {
    throw createError({ statusCode: 400, statusMessage: (e as Error).message })
  }
})
