import { addDays, addMonths, getDay, getDaysInMonth, isValid, parse } from 'date-fns'
import { DESCRIPTION_CUSTOMER, DESCRIPTION_INTERNAL } from './versionName'

export interface VersionNameV2Options {
  major: number
  /** 0-99 */
  minor: number
  /** YYYY-MM-DD, must be Monday-Friday; overrides `now` as the base date */
  date?: string
  /** Used when `date` is omitted; "today" is read in `timeZone` */
  now?: Date
  /** IANA zone used to read `now`, default Asia/Bangkok */
  timeZone?: string
  /** Months from the base date, -24..24; a weekend result moves to the next Monday */
  monthOffset?: number
}

export interface VersionNameV2Result {
  name: string
  major: number
  minor: number
  /** YYMM of the week's Friday, e.g. "2612" */
  yymm: string
  /** D: 0-based index of the week's Friday in its month */
  week: number
  isLastOfMonth: boolean
  description: string
  /** Sunday after the week's Friday, YYYY-MM-DD */
  dueDate: string
  /** Monday of the week, YYYY-MM-DD */
  weekStart: string
  friday: string
  baseDate: string
  targetDate: string
}

const formatYmd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/** Strict YYYY-MM-DD: rejects 2026-02-30, which date-fns parse would not. */
const parseYmd = (s: string): Date => {
  const d = parse(s, 'yyyy-MM-dd', new Date())
  if (!isValid(d) || formatYmd(d) !== s) throw new RangeError('date must be a valid YYYY-MM-DD')
  return d
}

const todayIn = (now: Date, timeZone: string): Date => {
  let ymd: string
  try {
    ymd = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
  } catch {
    throw new RangeError('timeZone must be a valid IANA time zone')
  }
  return parseYmd(ymd)
}

const isWeekend = (d: Date) => getDay(d) === 0 || getDay(d) === 6

/**
 * A.B.C.D = major . minor . YYMM . D
 * A week is Mon-Fri and belongs to the month of its Friday; D is that Friday's 0-based index in
 * the month and the month's last Friday is the Customer version.
 */
export function generateVersionNameV2(opts: VersionNameV2Options): VersionNameV2Result {
  const { major, minor, monthOffset = 0, timeZone = 'Asia/Bangkok' } = opts
  if (!Number.isInteger(major) || major < 1 || major > 99) throw new RangeError('major must be an integer 1-99')
  if (!Number.isInteger(minor) || minor < 0 || minor > 99) throw new RangeError('minor must be an integer 0-99')
  if (!Number.isInteger(monthOffset) || monthOffset < -24 || monthOffset > 24) throw new RangeError('monthOffset must be an integer -24 to 24')

  const base = opts.date ? parseYmd(opts.date) : todayIn(opts.now ?? new Date(), timeZone)
  if (isWeekend(base)) throw new RangeError('date must be Monday-Friday')

  let target = addMonths(base, monthOffset)
  if (getDay(target) === 6) target = addDays(target, 2)
  else if (getDay(target) === 0) target = addDays(target, 1)

  const friday = addDays(target, 5 - getDay(target))
  const week = Math.floor((friday.getDate() - 1) / 7)
  const isLastOfMonth = friday.getDate() + 7 > getDaysInMonth(friday)
  const yymm = `${String(friday.getFullYear() % 100).padStart(2, '0')}${String(friday.getMonth() + 1).padStart(2, '0')}`

  return {
    name: `${major}.${minor}.${yymm}.${week}`,
    major, minor, yymm, week, isLastOfMonth,
    description: isLastOfMonth ? DESCRIPTION_CUSTOMER : DESCRIPTION_INTERNAL,
    dueDate: formatYmd(addDays(friday, 2)),
    weekStart: formatYmd(addDays(friday, -4)),
    friday: formatYmd(friday),
    baseDate: formatYmd(base),
    targetDate: formatYmd(target),
  }
}
