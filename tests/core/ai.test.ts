import { describe, it, expect } from 'vitest';
import { normalizeAssistant, suggestAssistant } from '../../src/core/ai.js';

describe('ai helpers', () => {
  it('should normalize supported assistant names', () => {
    expect(normalizeAssistant('claude')).toBe('claude');
    expect(normalizeAssistant('CoDex')).toBe('codex');
    expect(normalizeAssistant('unknown')).toBeNull();
  });

  it('should suggest close assistant names for typos', () => {
    expect(suggestAssistant('claued')).toBe('claude');
    expect(suggestAssistant('codoex')).toBe('codex');
    expect(suggestAssistant('cursr')).toBe('cursor');
    expect(suggestAssistant('zzz')).toBeNull();
  });
});
