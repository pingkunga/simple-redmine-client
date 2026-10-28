import { addDays, addMonths, getWeekOfMonth, getWeeksInMonth, parse, isValid } from 'date-fns'

export const DESCRIPTION_INTERNAL = 'Internal version for QA/UAT ห้ามนำไปขึ้นให้ลูกค้าใช้งานจริง'
export const DESCRIPTION_CUSTOMER = 'Customer version for PRODUCTION'

export interface VersionNameOptions {
  major: number
  now?: Date
  /** YYYY-MM-DD; overrides `now` as the base date */
  date?: string
  monthOffset?: number
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6
}

export interface VersionNameResult {
  name: string
  major: number
  year: number
  month: number
  week: number
  isLastOfMonth: boolean
  description: string
  /** Sunday closing the target week, YYYY-MM-DD */
  dueDate: string
  baseDate: string
  targetDate: string
}

const fmt = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/** A.B.C.D = major . yy . month . (week of month - 1) */
export function generateVersionName(opts: VersionNameOptions): VersionNameResult {
  const { major, monthOffset = 0, weekStartsOn = 1 } = opts
  if (!Number.isInteger(major) || major < 1 || major > 99) throw new RangeError('major must be an integer 1-99')
  if (!Number.isInteger(monthOffset) || monthOffset < 0 || monthOffset > 24) throw new RangeError('monthOffset must be an integer 0-24')

  let base = opts.now ?? new Date()
  if (opts.date) {
    base = parse(opts.date, 'yyyy-MM-dd', new Date())
    if (!isValid(base)) throw new RangeError('date must be a valid YYYY-MM-DD')
  }

  const target = addMonths(base, monthOffset)
  const year = target.getFullYear() % 100
  const month = target.getMonth() + 1
  const week = getWeekOfMonth(target, { weekStartsOn }) - 1

  const isLastOfMonth = week === getWeeksInMonth(target, { weekStartsOn }) - 1
  const dueDate = addDays(target, (7 - target.getDay()) % 7)

  return {
    name: `${major}.${year}.${month}.${week}`,
    major, year, month, week, isLastOfMonth,
    description: isLastOfMonth ? DESCRIPTION_CUSTOMER : DESCRIPTION_INTERNAL,
    dueDate: fmt(dueDate),
    baseDate: fmt(base),
    targetDate: fmt(target),
  }
}
