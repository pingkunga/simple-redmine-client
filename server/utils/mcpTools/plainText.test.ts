import { describe, expect, it } from 'vitest'
import { toPlainText } from './plainText'

describe('toPlainText', () => {
  it('drops tags, keeps line breaks and decodes common entities', () => {
    const out = toPlainText('<p>Change <b>config</b>&nbsp;A &amp; B</p><br>Restart &lt;svc&gt;', 400)
    expect(out).toEqual({ text: 'Change config A & B\n\nRestart <svc>', truncated: false })
  })

  it('does not emit markup that survived as text from tags', () => {
    expect(toPlainText('<script>alert(1)</script>hi', 400).text).toBe('alert(1)hi')
  })

  it('collapses whitespace and blank lines', () => {
    expect(toPlainText('a   b\n\n\n\nc', 400).text).toBe('a b\n\nc')
  })

  it('truncates and flags it', () => {
    const out = toPlainText('x'.repeat(50), 10)
    expect(out.truncated).toBe(true)
    expect(out.text).toBe(`${'x'.repeat(10)}…`)
  })

  it('returns empty text for empty input', () => {
    expect(toPlainText('', 10)).toEqual({ text: '', truncated: false })
  })
})
