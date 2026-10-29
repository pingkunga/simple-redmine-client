import { describe, expect, it } from 'vitest'
import { chatFileName, chatToMarkdown } from './chatExport'

const now = new Date(2026, 9, 30, 9, 5)

describe('chatFileName', () => {
  it('uses local date and zero-padded time', () => {
    expect(chatFileName(now)).toBe('ai-chat-2026-10-30-0905.md')
  })
})

describe('chatToMarkdown', () => {
  it('writes user and assistant turns in order under role headings', () => {
    const md = chatToMarkdown([
      { role: 'user', parts: [{ type: 'text', text: 'hi' }] },
      { role: 'assistant', parts: [{ type: 'text', text: '| a |\n|---|' }] },
    ], now)
    expect(md).toBe('# AI Chat\n\nExported 2026-10-30 09:05\n\n## You\n\nhi\n\n## Assistant\n\n| a |\n|---|\n')
  })

  it('joins text parts and ignores tool and reasoning parts', () => {
    const md = chatToMarkdown([
      { role: 'assistant', parts: [{ type: 'tool-list_versions' }, { type: 'reasoning', text: 'secret' }, { type: 'text', text: 'a' }, { type: 'text', text: 'b' }] },
    ], now)
    expect(md).toContain('## Assistant\n\nab')
    expect(md).not.toContain('secret')
  })

  it('skips messages without visible text', () => {
    const md = chatToMarkdown([
      { role: 'assistant', parts: [{ type: 'tool-x' }] },
      { role: 'user', parts: [{ type: 'text', text: '  ' }] },
    ], now)
    expect(md).not.toContain('##')
  })
})
