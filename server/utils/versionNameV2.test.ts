import { describe, expect, it } from 'vitest'
import { generateVersionNameV2 } from './versionNameV2'
import { DESCRIPTION_CUSTOMER, DESCRIPTION_INTERNAL } from './versionName'

const gen = (date: string, extra = {}) => generateVersionNameV2({ major: 10, minor: 1, date, ...extra })

describe('generateVersionNameV2', () => {
  it.each([
    ['2026-11-27', '10.1.2611.3', true, '2026-11-29'], // Fri, last Friday of Nov
    ['2026-11-30', '10.1.2612.0', false, '2026-12-06'], // Mon of a week whose Friday is 4 Dec
    ['2026-12-04', '10.1.2612.0', false, '2026-12-06'],
    ['2027-04-21', '10.1.2704.3', false, '2027-04-25'], // Wed; Fridays 2,9,16,23,30 so 23 is not last
    ['2027-04-30', '10.1.2704.4', true, '2027-05-02'],
    ['2027-05-03', '10.1.2705.0', false, '2027-05-09'],
  ])('%s -> %s', (date, name, isLast, due) => {
    const r = gen(date)
    expect(r.name).toBe(name)
    expect(r.isLastOfMonth).toBe(isLast)
    expect(r.description).toBe(isLast ? DESCRIPTION_CUSTOMER : DESCRIPTION_INTERNAL)
    expect(r.dueDate).toBe(due)
  })

  it('rejects Saturday and Sunday input', () => {
    expect(() => gen('2027-05-01')).toThrow(RangeError) // Sat
    expect(() => gen('2027-05-02')).toThrow(RangeError) // Sun
  })

  it('Monday to Friday of the same week give the same version', () => {
    const names = ['2026-11-30', '2026-12-01', '2026-12-02', '2026-12-03', '2026-12-04'].map((d) => gen(d).name)
    expect(new Set(names)).toEqual(new Set(['10.1.2612.0']))
    expect(gen('2026-12-02').weekStart).toBe('2026-11-30')
    expect(gen('2026-12-02').friday).toBe('2026-12-04')
  })

  it('YYMM follows the Friday across the year boundary', () => {
    expect(gen('2026-12-28').name).toBe('10.1.2701.0') // Mon 28 Dec .. Fri 1 Jan
    expect(gen('2026-12-31').name).toBe('10.1.2701.0') // Thu
    expect(gen('2026-12-25').name).toBe('10.1.2612.3')
    expect(gen('2026-12-25').isLastOfMonth).toBe(true)
    expect(gen('2027-12-15').yymm).toBe('2712')
  })

  it('five-Friday month: the fifth Friday is index 4 and Customer', () => {
    const r = gen('2027-01-29')
    expect(r.name).toBe('10.1.2701.4')
    expect(r.isLastOfMonth).toBe(true)
  })

  it('rejects bad input', () => {
    expect(() => gen('2026-02-30')).toThrow(RangeError)
    expect(() => gen('2026-13-01')).toThrow(RangeError)
    expect(() => generateVersionNameV2({ major: 0, minor: 1, date: '2026-11-27' })).toThrow(RangeError)
    expect(() => generateVersionNameV2({ major: 10, minor: 100, date: '2026-11-27' })).toThrow(RangeError)
    expect(() => generateVersionNameV2({ major: 10, minor: -1, date: '2026-11-27' })).toThrow(RangeError)
    expect(() => generateVersionNameV2({ major: 10, minor: 1.5, date: '2026-11-27' })).toThrow(RangeError)
  })

  it('accepts minor 0', () => {
    expect(generateVersionNameV2({ major: 10, minor: 0, date: '2026-11-27' }).name).toBe('10.0.2611.3')
  })

  describe('without date (today in the configured zone)', () => {
    it('reads today in Asia/Bangkok, not UTC', () => {
      // 29 Nov 2026 20:00 UTC is already Monday 30 Nov 03:00 in Bangkok
      const r = generateVersionNameV2({ major: 10, minor: 1, now: new Date('2026-11-29T20:00:00Z') })
      expect(r.baseDate).toBe('2026-11-30')
      expect(r.name).toBe('10.1.2612.0')
    })

    it('errors when today is Saturday or Sunday in that zone', () => {
      expect(() => generateVersionNameV2({ major: 10, minor: 1, now: new Date('2027-05-01T05:00:00Z') })).toThrow(RangeError)
      // Friday 22:00 UTC is already Saturday in Bangkok
      expect(() => generateVersionNameV2({ major: 10, minor: 1, now: new Date('2027-04-30T22:00:00Z') })).toThrow(RangeError)
    })

    it('honours a custom time zone', () => {
      const now = new Date('2026-11-29T20:00:00Z') // still Sunday 29 Nov in UTC
      expect(() => generateVersionNameV2({ major: 10, minor: 1, now, timeZone: 'UTC' })).toThrow(RangeError)
    })

    it('rejects an unknown time zone', () => {
      expect(() => generateVersionNameV2({ major: 10, minor: 1, now: new Date(), timeZone: 'Not/AZone' })).toThrow(RangeError)
    })
  })

  describe('monthOffset', () => {
    it('moves to the same day of the target month', () => {
      const r = gen('2026-10-27', { monthOffset: 1 }) // Tue 27 Nov, Friday 27 Nov
      expect(r.targetDate).toBe('2026-11-27')
      expect(r.name).toBe('10.1.2611.3')
    })

    it('moves a Saturday result to the next Monday', () => {
      const r = gen('2027-03-01', { monthOffset: 2 }) // Mon 1 Mar + 2 -> Sat 1 May 2027
      expect(r.targetDate).toBe('2027-05-03')
      expect(r.name).toBe('10.1.2705.0')
    })

    it('moves a Sunday result to the next Monday', () => {
      const r = gen('2027-04-02', { monthOffset: 1 }) // Fri 2 Apr + 1 -> Sun 2 May 2027
      expect(r.targetDate).toBe('2027-05-03')
    })

    it('still rejects a weekend input before the offset is applied', () => {
      expect(() => gen('2027-05-01', { monthOffset: 1 })).toThrow(RangeError)
    })

    it('rejects out-of-range offsets', () => {
      expect(() => gen('2026-11-27', { monthOffset: 25 })).toThrow(RangeError)
      expect(() => gen('2026-11-27', { monthOffset: -25 })).toThrow(RangeError)
    })
  })
})
