import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import {
  assertSessionSecret,
  signSession,
  verifySession,
  getSessionUser,
  getSessionRoles,
  setSessionUser,
  PLACEHOLDER_SESSION_SECRET,
  type SessionData,
} from './session'

const h3 = vi.hoisted(() => ({
  getCookie: vi.fn(),
  setCookie: vi.fn(),
  deleteCookie: vi.fn(),
}))
vi.mock('h3', () => h3)

const runtimeConfig = vi.hoisted(() => ({ value: {} as Record<string, unknown> }))
mockNuxtImport('useRuntimeConfig', () => () => runtimeConfig.value)

const SECRET = 'test-secret-with-enough-length-0123456789'
const future = () => Date.now() + 60_000
const session = (over: Partial<SessionData> = {}): SessionData => ({
  user: 'admin', roles: ['admin', 'scm'], expiry: future(), ...over,
})

describe('signSession / verifySession', () => {
  it('round-trips a signed session', () => {
    const data = session()
    expect(verifySession(signSession(data, SECRET), SECRET)).toEqual(data)
  })

  it('rejects the old unsigned base64 format (forged cookie)', () => {
    const forged = Buffer.from(JSON.stringify(session({ user: 'attacker' }))).toString('base64')
    expect(verifySession(forged, SECRET)).toBeNull()
  })

  it('rejects a tampered payload with the original signature', () => {
    const [, sig] = signSession(session(), SECRET).split('.')
    const evil = Buffer.from(JSON.stringify(session({ user: 'attacker' }))).toString('base64url')
    expect(verifySession(`${evil}.${sig}`, SECRET)).toBeNull()
  })

  it('rejects a tampered or truncated signature', () => {
    const value = signSession(session(), SECRET)
    expect(verifySession(value.slice(0, -4), SECRET)).toBeNull()
    expect(verifySession(`${value.split('.')[0]}.AAAA`, SECRET)).toBeNull()
    expect(verifySession(`${value.split('.')[0]}.`, SECRET)).toBeNull()
  })

  it('rejects a cookie signed with another secret', () => {
    expect(verifySession(signSession(session(), 'other-secret'), SECRET)).toBeNull()
  })

  it('rejects garbage', () => {
    expect(verifySession('', SECRET)).toBeNull()
    expect(verifySession('nodot', SECRET)).toBeNull()
    expect(verifySession('.sig', SECRET)).toBeNull()
  })
})

describe('assertSessionSecret (fail-closed)', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('throws on empty or missing secret', () => {
    expect(() => assertSessionSecret('')).toThrow(/not configured/)
    expect(() => assertSessionSecret(undefined)).toThrow(/not configured/)
  })

  it('rejects the placeholder unless NODE_ENV is development or test', () => {
    vi.stubEnv('NODE_ENV', 'production')
    expect(() => assertSessionSecret(PLACEHOLDER_SESSION_SECRET)).toThrow(/placeholder/)
    vi.stubEnv('NODE_ENV', '')   // runtime image: effectively unset
    expect(() => assertSessionSecret(PLACEHOLDER_SESSION_SECRET)).toThrow(/placeholder/)
    vi.stubEnv('NODE_ENV', 'staging')
    expect(() => assertSessionSecret(PLACEHOLDER_SESSION_SECRET)).toThrow(/placeholder/)
  })

  it('allows the placeholder in development and test', () => {
    vi.stubEnv('NODE_ENV', 'development')
    expect(assertSessionSecret(PLACEHOLDER_SESSION_SECRET)).toBe(PLACEHOLDER_SESSION_SECRET)
    vi.stubEnv('NODE_ENV', 'test')
    expect(assertSessionSecret(PLACEHOLDER_SESSION_SECRET)).toBe(PLACEHOLDER_SESSION_SECRET)
  })

  it('accepts a real secret in production', () => {
    vi.stubEnv('NODE_ENV', 'production')
    expect(assertSessionSecret(SECRET)).toBe(SECRET)
  })
})

describe('session helpers with an H3 event', () => {
  const event = {} as any

  beforeEach(() => {
    vi.clearAllMocks()
    runtimeConfig.value = { adminSessionSecret: SECRET, adminSessionSecure: false }
  })

  it('setSessionUser writes a signed httpOnly cookie that getSessionUser accepts', () => {
    setSessionUser(event, 'admin')
    const call = h3.setCookie.mock.calls.find(c => c[1] === 'admin_session')!
    expect(call[3].httpOnly).toBe(true)

    h3.getCookie.mockReturnValue(call[2])
    expect(getSessionUser(event)).toBe('admin')
    expect(getSessionRoles(event)).toEqual(['admin', 'scm'])
  })

  it('setSessionUser throws when the secret is missing', () => {
    runtimeConfig.value = { adminSessionSecret: '' }
    expect(() => setSessionUser(event, 'admin')).toThrow(/not configured/)
    expect(h3.setCookie).not.toHaveBeenCalled()
  })

  it('ignores a forged unsigned cookie', () => {
    h3.getCookie.mockReturnValue(Buffer.from(JSON.stringify(session({ user: 'attacker' }))).toString('base64'))
    expect(getSessionUser(event)).toBeNull()
    expect(getSessionRoles(event)).toEqual([])
  })

  it('returns null and clears cookies for an expired signed session', () => {
    h3.getCookie.mockReturnValue(signSession(session({ expiry: Date.now() - 1 }), SECRET))
    expect(getSessionUser(event)).toBeNull()
    expect(h3.deleteCookie).toHaveBeenCalledWith(event, 'admin_session')
    expect(h3.deleteCookie).toHaveBeenCalledWith(event, 'user_roles')
  })

  it('returns null (does not throw) when the secret is misconfigured', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    runtimeConfig.value = { adminSessionSecret: '' }
    h3.getCookie.mockReturnValue(signSession(session(), SECRET))
    expect(getSessionUser(event)).toBeNull()
  })

  it('returns null when there is no cookie', () => {
    h3.getCookie.mockReturnValue(undefined)
    expect(getSessionUser(event)).toBeNull()
  })
})
