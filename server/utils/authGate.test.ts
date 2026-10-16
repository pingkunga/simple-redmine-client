import { describe, expect, it } from 'vitest'
import { assertChatAccess, assertMcpAccess, safeEqual, isChatPath, isMcpPath } from './authGate'

const statusOf = (fn: () => void): number | undefined => {
  try { fn() } catch (e: any) { return e.statusCode }
  return undefined
}

describe('safeEqual', () => {
  it('compares strings, including different lengths', () => {
    expect(safeEqual('abc', 'abc')).toBe(true)
    expect(safeEqual('abc', 'abd')).toBe(false)
    expect(safeEqual('abc', 'abcd')).toBe(false)
    expect(safeEqual('', 'a')).toBe(false)
  })
})

describe('assertChatAccess (anonymous chat)', () => {
  const base = { method: 'POST', host: 'app.local:3000' }

  it('allows POST with Sec-Fetch-Site same-origin, no session needed', () => {
    expect(statusOf(() => assertChatAccess({ ...base, secFetchSite: 'same-origin' }))).toBeUndefined()
  })

  it('allows POST when Origin host matches the request host', () => {
    expect(statusOf(() => assertChatAccess({ ...base, origin: 'http://app.local:3000' }))).toBeUndefined()
  })

  it('rejects POST from a foreign Origin', () => {
    expect(statusOf(() => assertChatAccess({ ...base, origin: 'https://evil.example' }))).toBe(403)
    expect(statusOf(() => assertChatAccess({ ...base, secFetchSite: 'cross-site', origin: 'https://evil.example' }))).toBe(403)
  })

  it('rejects POST with neither Origin nor Sec-Fetch-Site (fail-closed)', () => {
    expect(statusOf(() => assertChatAccess(base))).toBe(403)
  })

  it('rejects POST with an unparsable Origin', () => {
    expect(statusOf(() => assertChatAccess({ ...base, origin: 'null' }))).toBe(403)
  })

  it('does not require same-origin proof for GET', () => {
    expect(statusOf(() => assertChatAccess({ ...base, method: 'GET' }))).toBeUndefined()
  })
})

describe('assertMcpAccess', () => {
  const KEY = 'k'.repeat(32)

  it('refuses everything when no key is configured', () => {
    expect(statusOf(() => assertMcpAccess({ expectedKey: '', authorization: 'Bearer ', xApiKey: '' }))).toBe(401)
    expect(statusOf(() => assertMcpAccess({ expectedKey: undefined, xApiKey: 'anything' }))).toBe(401)
  })

  it('rejects missing or wrong credentials', () => {
    expect(statusOf(() => assertMcpAccess({ expectedKey: KEY }))).toBe(401)
    expect(statusOf(() => assertMcpAccess({ expectedKey: KEY, xApiKey: 'wrong' }))).toBe(401)
    expect(statusOf(() => assertMcpAccess({ expectedKey: KEY, authorization: 'Bearer wrong' }))).toBe(401)
    expect(statusOf(() => assertMcpAccess({ expectedKey: KEY, authorization: `Basic ${KEY}` }))).toBe(401)
  })

  it('accepts the key as Bearer token or x-api-key', () => {
    expect(statusOf(() => assertMcpAccess({ expectedKey: KEY, authorization: `Bearer ${KEY}` }))).toBeUndefined()
    expect(statusOf(() => assertMcpAccess({ expectedKey: KEY, xApiKey: KEY }))).toBeUndefined()
  })
})

describe('path matching', () => {
  it('matches only the exact route and its sub-paths', () => {
    expect(isChatPath('/api/chat')).toBe(true)
    expect(isChatPath('/api/chat/x')).toBe(true)
    expect(isChatPath('/api/chatty')).toBe(false)
    expect(isMcpPath('/api/mcp')).toBe(true)
    expect(isMcpPath('/api/mcp/session')).toBe(true)
    expect(isMcpPath('/api/mcpx')).toBe(false)
  })
})
