import { describe, expect, it } from 'vitest';
import { toTextOnlyMessages } from './chatRequestBody';

describe('toTextOnlyMessages', () => {
  it('drops tool parts and keeps text', () => {
    const out = toTextOnlyMessages([
      { id: 'a', role: 'assistant', parts: [{ type: 'tool-get_issues', text: undefined }, { type: 'text', text: 'hi' }] },
    ]);
    expect(out).toEqual([{ id: 'a', role: 'assistant', parts: [{ type: 'text', text: 'hi' }] }]);
  });

  it('removes messages left without text', () => {
    const out = toTextOnlyMessages([
      { role: 'user', parts: [{ type: 'text', text: 'q' }] },
      { role: 'assistant', parts: [{ type: 'tool-x' }] },
      { role: 'assistant', parts: [{ type: 'text', text: '' }] },
    ]);
    expect(out).toHaveLength(1);
  });

  it('preserves order', () => {
    const out = toTextOnlyMessages([
      { role: 'user', parts: [{ type: 'text', text: '1' }] },
      { role: 'assistant', parts: [{ type: 'text', text: '2' }] },
      { role: 'user', parts: [{ type: 'text', text: '3' }] },
    ]);
    expect(out.map(m => m.parts[0]!.text)).toEqual(['1', '2', '3']);
  });
});
