import { describe, expect, it } from 'vitest'
import { generateVersionName, DESCRIPTION_CUSTOMER, DESCRIPTION_INTERNAL } from './versionName'

const gen = (date: string, extra = {}) => generateVersionName({ major: 10, date, ...extra })

describe('generateVersionName', () => {
  it('week 1 of the month gives D=0', () => {
    expect(gen('2026-10-01').name).toBe('10.26.10.0')
  })

  it('later week gives D = week - 1', () => {
    // Oct 2026 starts Thu; Monday-start weeks: 1-4, 5-11, 12-18, 19-25, 26-31
    expect(gen('2026-10-27').name).toBe('10.26.10.4')
    expect(gen('2026-10-05').name).toBe('10.26.10.1')
  })

  it('weekStartsOn changes the week boundary', () => {
    expect(gen('2026-10-04', { weekStartsOn: 1 }).week).toBe(0)
    expect(gen('2026-10-04', { weekStartsOn: 0 }).week).toBe(1)
  })

  it('monthOffset moves to a later month', () => {
    const r = gen('2026-10-27', { monthOffset: 1 })
    expect(r.month).toBe(11)
    expect(r.targetDate).toBe('2026-11-27')
    expect(r.name).toBe('10.26.11.4')
  })

  it('monthOffset crosses the year', () => {
    const r = gen('2026-12-15', { monthOffset: 1 })
    expect(r.year).toBe(27)
    expect(r.month).toBe(1)
  })

  it('negative monthOffset moves to an earlier month', () => {
    const r = gen('2026-10-27', { monthOffset: -1 })
    expect(r.month).toBe(9)
    expect(r.targetDate).toBe('2026-09-27')
  })

  it('negative monthOffset crosses the year backwards', () => {
    const r = gen('2026-01-15', { monthOffset: -1 })
    expect(r.year).toBe(25)
    expect(r.month).toBe(12)
  })

  it('clamps day-of-month going backwards', () => {
    expect(gen('2026-03-31', { monthOffset: -1 }).targetDate).toBe('2026-02-28')
  })

  it('clamps day-of-month when the target month is shorter', () => {
    expect(gen('2026-01-31', { monthOffset: 1 }).targetDate).toBe('2026-02-28')
  })

  it('uses now when date is omitted', () => {
    expect(generateVersionName({ major: 8, now: new Date(2026, 9, 1) }).name).toBe('8.26.10.0')
  })

  it('rejects bad input', () => {
    expect(() => generateVersionName({ major: 0 })).toThrow(RangeError)
    expect(() => generateVersionName({ major: 10, monthOffset: -25 })).toThrow(RangeError)
    expect(() => generateVersionName({ major: 10, monthOffset: 25 })).toThrow(RangeError)
    expect(() => generateVersionName({ major: 10, monthOffset: 1.5 })).toThrow(RangeError)
    expect(() => gen('2026-13-40')).toThrow(RangeError)
  })

  it('non-last week is Internal, last week of the month is Customer', () => {
    expect(gen('2026-10-05').description).toBe(DESCRIPTION_INTERNAL)
    expect(gen('2026-10-27').isLastOfMonth).toBe(true)
    expect(gen('2026-10-27').description).toBe(DESCRIPTION_CUSTOMER)
  })

  it('last-week flag follows monthOffset and weekStartsOn', () => {
    expect(gen('2026-10-27', { monthOffset: 1 }).isLastOfMonth).toBe(false) // 27 Nov = week 5 of 6 (30 Nov is a lone week)
    expect(gen('2026-10-30', { monthOffset: 1 }).isLastOfMonth).toBe(true) // 30 Nov
    expect(gen('2026-10-27', { weekStartsOn: 0 }).isLastOfMonth).toBe(true)
    expect(gen('2026-10-20').isLastOfMonth).toBe(false)
  })

  it('due date is the Sunday closing the week, even across a month', () => {
    expect(gen('2026-10-05').dueDate).toBe('2026-10-11')
    expect(gen('2026-10-11').dueDate).toBe('2026-10-11')
    expect(gen('2026-10-27').dueDate).toBe('2026-11-01')
  })
})
