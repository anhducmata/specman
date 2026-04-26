import { describe, it, expect } from 'vitest';
import { normalizeAssistant, suggestAssistant } from '../../src/core/ai.js';

describe('ai helpers', () => {
  it('should normalize supported assistant names', () => {
    expect(normalizeAssistant('claude')).toBe('claude');
    expect(normalizeAssistant('CoDex')).toBe('codex');
    expect(normalizeAssistant('Gemini')).toBe('gemini');
    expect(normalizeAssistant('AIDER')).toBe('aider');
    expect(normalizeAssistant('Q')).toBe('q');
    expect(normalizeAssistant('cursor')).toBeNull();
    expect(normalizeAssistant('unknown')).toBeNull();
  });

  it('should suggest close assistant names for typos', () => {
    expect(suggestAssistant('claued')).toBe('claude');
    expect(suggestAssistant('codoex')).toBe('codex');
    expect(suggestAssistant('gemin')).toBe('gemini');
    expect(suggestAssistant('aidr')).toBe('aider');
    expect(suggestAssistant('zzz')).toBeNull();
  });
});
