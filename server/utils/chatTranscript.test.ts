import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createTranscriptWriter, MAX_FIELD_CHARS, type ChatTranscript } from './chatTranscript'

const rec = (over: Partial<ChatTranscript> = {}): ChatTranscript => ({
  ts: '2026-10-19T00:00:00.000Z', ip: '1.2.3.4', ms: 5, outcome: 'ok', question: 'q', historyCount: 1, steps: [], ...over,
})

const at = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12).getTime()

let dir: string
beforeEach(async () => { dir = await mkdtemp(path.join(os.tmpdir(), 'chat-log-')) })
afterEach(async () => { await rm(dir, { recursive: true, force: true }) })

describe('createTranscriptWriter', () => {
  it('appends one JSON line per record to the dated file', async () => {
    const w = createTranscriptWriter({ dir, retentionDays: 30, now: () => at(2026, 10, 19) })
    await w.write(rec({ question: 'first' }))
    await w.write(rec({ question: 'second', steps: [{ toolCalls: [{ name: 't', input: { a: 1 } }], toolResults: [{ name: 't', output: { b: 2 } }] }] }))

    const lines = (await readFile(path.join(dir, '2026-10-19.jsonl'), 'utf8')).trim().split('\n').map(l => JSON.parse(l))
    expect(lines.map(l => l.question)).toEqual(['first', 'second'])
    expect(lines[1].steps[0].toolResults[0].output).toEqual({ b: 2 })
  })

  it('writes a new file each day', async () => {
    let t = at(2026, 10, 19)
    const w = createTranscriptWriter({ dir, retentionDays: 30, now: () => t })
    await w.write(rec())
    t = at(2026, 10, 20)
    await w.write(rec())
    expect((await readdir(dir)).sort()).toEqual(['2026-10-19.jsonl', '2026-10-20.jsonl'])
  })

  it('prunes only dated files older than the retention window', async () => {
    await writeFile(path.join(dir, '2026-09-01.jsonl'), 'old\n')
    await writeFile(path.join(dir, '2026-10-10.jsonl'), 'recent\n')
    await writeFile(path.join(dir, 'notes.txt'), 'keep\n')
    const w = createTranscriptWriter({ dir, retentionDays: 30, now: () => at(2026, 10, 19) })
    await w.write(rec())
    expect((await readdir(dir)).sort()).toEqual(['2026-10-10.jsonl', '2026-10-19.jsonl', 'notes.txt'])
  })

  it('truncates oversized fields and flags the record', async () => {
    const w = createTranscriptWriter({ dir, retentionDays: 30, now: () => at(2026, 10, 19) })
    await w.write(rec({ answer: 'x'.repeat(MAX_FIELD_CHARS + 50) }))
    const line = JSON.parse((await readFile(path.join(dir, '2026-10-19.jsonl'), 'utf8')).trim())
    expect(line.truncated).toBe(true)
    expect(line.answer.length).toBeLessThan(MAX_FIELD_CHARS + 100)
  })

  it('never throws when the directory cannot be written', async () => {
    const blocker = path.join(dir, 'file')
    await writeFile(blocker, '')
    const err = vi.spyOn(console, 'error').mockImplementation(() => {})
    const w = createTranscriptWriter({ dir: path.join(blocker, 'sub'), retentionDays: 30 })
    await expect(w.write(rec())).resolves.toBeUndefined()
    expect(err).toHaveBeenCalled()
    err.mockRestore()
  })
})
