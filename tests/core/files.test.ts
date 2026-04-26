import { describe, it, expect } from 'vitest';
import { mapWithConcurrency, toKebabCase } from '../../src/core/files.js';

describe('files utilities', () => {
  describe('toKebabCase', () => {
    it('should normalize titles into safe filenames', () => {
      expect(toKebabCase('Fix Login Timeout')).toBe('fix-login-timeout');
      expect(toKebabCase('  Fix---Login   Timeout  ')).toBe('fix-login-timeout');
      expect(toKebabCase('Fix: Login Timeout!')).toBe('fix-login-timeout');
    });

    it('should return empty string when no safe characters remain', () => {
      expect(toKebabCase('!!!')).toBe('');
    });
  });

  describe('mapWithConcurrency', () => {
    it('should preserve result order', async () => {
      const result = await mapWithConcurrency([3, 1, 2], 2, async value => value * 2);
      expect(result).toEqual([6, 2, 4]);
    });

    it('should limit concurrent work', async () => {
      let active = 0;
      let maxActive = 0;

      await mapWithConcurrency([1, 2, 3, 4, 5], 2, async value => {
        active++;
        maxActive = Math.max(maxActive, active);
        await new Promise(resolve => setTimeout(resolve, 5));
        active--;
        return value;
      });

      expect(maxActive).toBeLessThanOrEqual(2);
    });
  });
});
