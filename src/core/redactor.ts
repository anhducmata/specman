import type { SecretMatch } from '../types.js';

/**
 * Secret detection patterns.
 * Each pattern has a name and a regex to match against.
 */
const SECRET_PATTERNS: { name: string; regex: RegExp }[] = [
  // AWS Access Key
  { name: 'AWS Access Key', regex: /AKIA[0-9A-Z]{16}/g },
  // AWS Secret Key
  { name: 'AWS Secret Key', regex: /(?:aws_secret_access_key|secret_access_key)\s*[=:]\s*["']?[A-Za-z0-9/+=]{40}["']?/gi },
  // Generic API Key patterns
  { name: 'API Key', regex: /(?:api[_-]?key|apikey)\s*[=:]\s*["']?[A-Za-z0-9_\-]{20,}["']?/gi },
  // JWT-like tokens (three base64 segments separated by dots)
  { name: 'JWT Token', regex: /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_\-+/=]{10,}/g },
  // Private keys
  { name: 'Private Key', regex: /-----BEGIN\s+(RSA\s+|EC\s+|DSA\s+|OPENSSH\s+)?PRIVATE\sKEY-----/g },
  // Database URLs with password
  { name: 'Database URL', regex: /(?:postgres|mysql|mongodb|redis):\/\/[^:]+:[^@]+@[^\s"']+/gi },
  // Generic password assignment
  { name: 'Password', regex: /(?:password|passwd|pwd)\s*[=:]\s*["'][^"']{4,}["']/gi },
  // Generic token assignment
  { name: 'Token', regex: /(?:token|secret|auth_token|access_token|bearer)\s*[=:]\s*["'][A-Za-z0-9_\-+/=]{10,}["']/gi },
  // Long base64 strings (likely encoded secrets)
  { name: 'Base64 String', regex: /["'][A-Za-z0-9+/]{64,}={0,2}["']/g },
  // Email addresses (basic pattern)
  { name: 'Email Address', regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g },
];

/**
 * Check content for potential secrets.
 * Returns a list of matches with pattern name, matched text, and location.
 */
export function checkForSecrets(content: string): SecretMatch[] {
  const matches: SecretMatch[] = [];
  const lines = content.split('\n');

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];

    // Skip comments (markdown, yaml, json-style)
    const trimmed = line.trim();
    if (trimmed.startsWith('<!--') || trimmed.startsWith('#') || trimmed.startsWith('//')) {
      continue;
    }

    for (const { name, regex } of SECRET_PATTERNS) {
      // Reset regex lastIndex for global patterns
      regex.lastIndex = 0;
      let match: RegExpExecArray | null;

      while ((match = regex.exec(line)) !== null) {
        matches.push({
          pattern: name,
          match: match[0].length > 50 ? match[0].substring(0, 50) + '...' : match[0],
          line: lineIdx + 1,
          column: match.index + 1,
        });
      }
    }
  }

  return matches;
}

/**
 * Redact secrets from content.
 * Replaces matched secret patterns with [REDACTED].
 */
export function redactSecrets(content: string): string {
  let result = content;

  for (const { regex } of SECRET_PATTERNS) {
    regex.lastIndex = 0;
    result = result.replace(regex, '[REDACTED]');
  }

  return result;
}

/**
 * Check if content likely contains secrets.
 */
export function hasSecrets(content: string): boolean {
  return checkForSecrets(content).length > 0;
}
