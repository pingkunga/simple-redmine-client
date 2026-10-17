import { describe, expect, it } from 'vitest'
import { createChatLimiter } from './chatLimits'

const make = (over: Partial<Parameters<typeof createChatLimiter>[0]> = {}) => {
  let t = new Date(2026, 9, 17, 10, 0, 0).getTime()
  const limiter = createChatLimiter({ perMinute: 3, perIpPerDay: 5, perDay: 8, now: () => t, ...over })
  return { limiter, advance: (ms: number) => { t += ms }, at: () => t }
}

describe('chat limiter', () => {
  it('allows up to perMinute then rejects with a Retry-After', () => {
    const { limiter } = make()
    expect([1, 2, 3].map(() => limiter.take('a').ok)).toEqual([true, true, true])
    const d = limiter.take('a')
    expect(d).toMatchObject({ ok: false, reason: 'rate' })
    expect((d as { retryAfterSec: number }).retryAfterSec).toBeGreaterThan(0)
    expect((d as { retryAfterSec: number }).retryAfterSec).toBeLessThanOrEqual(60)
  })

  it('recovers once the minute window has passed', () => {
    const { limiter, advance } = make()
    for (let i = 0; i < 3; i++) limiter.take('a')
    expect(limiter.take('a').ok).toBe(false)
    advance(61_000)
    expect(limiter.take('a').ok).toBe(true)
  })

  it('keeps clients independent', () => {
    const { limiter } = make()
    for (let i = 0; i < 3; i++) limiter.take('a')
    expect(limiter.take('a').ok).toBe(false)
    expect(limiter.take('b').ok).toBe(true)
  })

  it('caps one client per day so it cannot drain the global budget', () => {
    const { limiter, advance } = make({ perMinute: 100 })
    for (let i = 0; i < 5; i++) { expect(limiter.take('a').ok).toBe(true); advance(1000) }
    expect(limiter.take('a')).toMatchObject({ ok: false, reason: 'ip_daily' })
    expect(limiter.take('b').ok).toBe(true)
  })

  it('enforces the global daily cap across clients', () => {
    const { limiter } = make({ perMinute: 100, perIpPerDay: 100, perDay: 4 })
    for (let i = 0; i < 4; i++) expect(limiter.take(`ip${i}`).ok).toBe(true)
    expect(limiter.take('new')).toMatchObject({ ok: false, reason: 'daily' })
  })

  it('resets daily counters at local midnight and reports time until then', () => {
    const { limiter, advance } = make({ perMinute: 100, perIpPerDay: 100, perDay: 2 })
    limiter.take('a'); limiter.take('b')
    const blocked = limiter.take('c') as { ok: false; retryAfterSec: number }
    expect(blocked.ok).toBe(false)
    expect(blocked.retryAfterSec).toBe(14 * 3600) // 10:00 -> midnight
    advance(15 * 3600 * 1000)
    expect(limiter.take('c').ok).toBe(true)
  })

  it('does not spend any budget on a rejected request', () => {
    const { limiter, advance } = make({ perMinute: 1, perIpPerDay: 100, perDay: 3 })
    limiter.take('a')
    for (let i = 0; i < 20; i++) limiter.take('a') // all rejected by the minute rule
    advance(61_000)
    expect(limiter.take('a').ok).toBe(true)
    expect(limiter.take('b').ok).toBe(true) // global budget: 3 total, 2 used
  })

  it('prunes idle clients so memory stays bounded', () => {
    const { limiter, advance } = make({ perMinute: 5, perIpPerDay: 5, perDay: 100_000 })
    for (let i = 0; i < 1100; i++) limiter.take(`ip${i}`)
    advance(61_000)
    limiter.take('trigger')
    expect(limiter._size()).toBeLessThan(10)
  })
})
