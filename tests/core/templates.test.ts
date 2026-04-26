import { describe, it, expect } from 'vitest';
import { caseFromData, caseTemplate } from '../../src/core/templates.js';

describe('templates', () => {
  describe('caseTemplate', () => {
    it('should include required case sections and usage metadata', () => {
      const content = caseTemplate('Fix Login Timeout');

      expect(content).toContain('# Case: Fix Login Timeout');
      expect(content).toContain('## Usage');
      expect(content).toContain('- Times Used: 0');
      expect(content).toContain('- Successful Uses: 0');
      expect(content).toContain('- Score: 0');
      expect(content).toContain('## Files Changed');
      expect(content).toContain('## Validation');
    });
  });

  describe('caseFromData', () => {
    it('should render case data with initial usage metadata', () => {
      const content = caseFromData({
        title: 'Recovered Build',
        status: 'Draft',
        problem: 'Build failed.',
        context: 'Safe context.',
        rootCause: 'Missing package.',
        solution: 'Installed package.',
        before: '',
        after: '',
        result: 'Build passed.',
        whenToReuse: 'Same build failure.',
        whenNotToUse: 'Different toolchain.',
        relatedSpecs: ['specs/engineering/testing-rules.md'],
        tags: ['build', 'ci'],
      });

      expect(content).toContain('# Case: Recovered Build');
      expect(content).toContain('- Times Used: 0');
      expect(content).toContain('- specs/engineering/testing-rules.md');
      expect(content).toContain('build, ci');
    });
  });
});
