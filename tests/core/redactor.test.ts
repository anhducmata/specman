import { describe, it, expect } from 'vitest';
import { checkForSecrets, redactSecrets, hasSecrets } from '../../src/core/redactor.js';

describe('redactor', () => {
  describe('checkForSecrets', () => {
    it('should detect AWS access keys', () => {
      const content = 'aws_key = AKIAIOSFODNN7EXAMPLE';
      const matches = checkForSecrets(content);
      expect(matches.some(m => m.pattern === 'AWS Access Key')).toBe(true);
    });

    it('should detect API keys', () => {
      const content = 'api_key = "sk-1234567890abcdefghij"';
      const matches = checkForSecrets(content);
      expect(matches.some(m => m.pattern === 'API Key')).toBe(true);
    });

    it('should detect JWT tokens', () => {
      const content = 'token = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';
      const matches = checkForSecrets(content);
      expect(matches.some(m => m.pattern === 'JWT Token')).toBe(true);
    });

    it('should detect private keys', () => {
      const content = '-----BEGIN RSA PRIVATE KEY-----';
      const matches = checkForSecrets(content);
      expect(matches.some(m => m.pattern === 'Private Key')).toBe(true);
    });

    it('should detect database URLs with passwords', () => {
      const content = 'DATABASE_URL=postgres://admin:secretpass@localhost:5432/mydb';
      const matches = checkForSecrets(content);
      expect(matches.some(m => m.pattern === 'Database URL')).toBe(true);
    });

    it('should detect passwords', () => {
      const content = 'password = "mysecretpassword123"';
      const matches = checkForSecrets(content);
      expect(matches.some(m => m.pattern === 'Password')).toBe(true);
    });

    it('should detect email addresses', () => {
      const content = 'Contact: admin@example.com';
      const matches = checkForSecrets(content);
      expect(matches.some(m => m.pattern === 'Email Address')).toBe(true);
    });

    it('should skip comments', () => {
      const content = '# password = "mysecretpassword123"';
      const matches = checkForSecrets(content);
      expect(matches).toHaveLength(0);
    });

    it('should return empty for clean content', () => {
      const content = '# Business Rule\n\nUsers must be active to login.';
      const matches = checkForSecrets(content);
      expect(matches).toHaveLength(0);
    });
  });

  describe('redactSecrets', () => {
    it('should redact AWS access keys', () => {
      const content = 'key = AKIAIOSFODNN7EXAMPLE';
      const redacted = redactSecrets(content);
      expect(redacted).not.toContain('AKIAIOSFODNN7EXAMPLE');
      expect(redacted).toContain('[REDACTED]');
    });

    it('should redact database URLs', () => {
      const content = 'url = postgres://user:pass@host/db';
      const redacted = redactSecrets(content);
      expect(redacted).toContain('[REDACTED]');
    });
  });

  describe('hasSecrets', () => {
    it('should return true for content with secrets', () => {
      expect(hasSecrets('key = AKIAIOSFODNN7EXAMPLE')).toBe(true);
    });

    it('should return false for clean content', () => {
      expect(hasSecrets('This is clean content.')).toBe(false);
    });
  });
});
