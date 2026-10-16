import { describe, expect, it, vi } from 'vitest'
import { withTimeout } from './types'

describe('withTimeout', () => {
  it('resolves with the value when the promise is fast enough', async () => {
    await expect(withTimeout(Promise.resolve(42), 1000, 'x')).resolves.toBe(42)
  })

  it('passes through the original rejection', async () => {
    await expect(withTimeout(Promise.reject(new Error('boom')), 1000, 'x')).rejects.toThrow('boom')
  })

  it('rejects with a labelled error when the promise is too slow', async () => {
    vi.useFakeTimers()
    try {
      const assertion = expect(withTimeout(new Promise(() => {}), 500, 'GitLab project 1')).rejects.toThrow('GitLab project 1 timed out after 500 ms')
      await vi.advanceTimersByTimeAsync(501)
      await assertion
    } finally {
      vi.useRealTimers()
    }
  })
})
