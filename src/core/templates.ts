import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ScanResult, CaseData } from '../types.js';

// ─── Template Reader ───

function readTemplate(category: 'init' | 'sync', filename: string, replacements: Record<string, string> = {}): string {
  try {
    const currentDir = dirname(fileURLToPath(import.meta.url));
    const promptsDir = join(currentDir, '..', '..', 'prompts', category);
    let content = readFileSync(join(promptsDir, filename), 'utf-8');
    
    for (const [key, value] of Object.entries(replacements)) {
      content = content.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    }
    
    return content;
  } catch (error) {
    console.error(`Failed to load template ${category}/${filename}:`, error);
    return `Error loading template: ${filename}`;
  }
}

// ─── Spec Templates ───

export function projectOverview(scan: ScanResult): string {
  return readTemplate('init', '00-project-overview.md', {
    name: scan.projectName || 'Unnamed Project',
    desc: scan.projectDescription || 'No description detected.',
  });
}

export function detectedStack(scan: ScanResult): string {
  const stackLines = scan.detectedStack.length > 0
    ? scan.detectedStack.map(t => `- **${t.name}** (detected from \`${t.source}\`, confidence: ${t.confidence})`).join('\n')
    : '- No technologies detected. Please add manually.';

  const fileLines = scan.detectedFiles.length > 0
    ? scan.detectedFiles.map(f => `- \`${f}\``).join('\n')
    : '- No known files detected.';

  return readTemplate('init', '01-detected-stack.md', {
    stackLines,
    fileLines,
    hasSrc: scan.hasSrc ? 'Yes' : 'No',
    hasTests: scan.hasTests ? 'Yes' : 'No',
    hasDocker: scan.hasDocker ? 'Yes' : 'No',
    hasCi: scan.hasCi ? 'Yes' : 'No',
    hasApi: scan.hasApi ? 'Yes' : 'No',
    hasMigrations: scan.hasMigrations ? 'Yes' : 'No',
  });
}

export function assumptions(scan: ScanResult): string {
  const stackAssumptions = scan.detectedStack
    .map(t => `- [ ] This project uses **${t.name}** (${t.confidence} confidence, source: \`${t.source}\`)`)
    .join('\n');

  return readTemplate('init', '02-assumptions.md', {
    stackAssumptions: stackAssumptions || '- No stack assumptions generated.',
    dockerAssumption: scan.hasDocker ? '- [ ] Docker is used for containerized deployment' : '',
    ciAssumption: scan.hasCi ? '- [ ] CI/CD is configured via GitHub Actions' : '',
    migrationsAssumption: scan.hasMigrations ? '- [ ] Database migrations are managed in the migrations/ directory' : '',
  });
}

export function openQuestions(): string {
  return readTemplate('init', '03-open-questions.md');
}

// ─── Product Templates ───

export function productRequirements(): string {
  return readTemplate('init', 'product/requirements.md');
}

// ─── Engineering Templates ───

export function codingRules(scan: ScanResult): string {
  const stackNames = scan.detectedStack.map(s => s.name.toLowerCase());
  let techSpecificRules = '';
  
  if (stackNames.includes('typescript') || stackNames.includes('node.js')) {
    techSpecificRules += `\n## TypeScript / Node.js\n> Note: Auto-injected based on detected stack.\n- Enforce \`strict\` mode in TypeScript.\n- Use \`eslint\` and \`prettier\` for formatting and linting.\n- Prefer \`async/await\` over raw Promises.\n- Use explicit return types on exported functions.\n- Avoid \`any\` types; use \`unknown\` or generics instead.\n`;
  }
  
  if (stackNames.includes('react') || stackNames.includes('next.js')) {
    techSpecificRules += `\n## React\n> Note: Auto-injected based on detected stack.\n- Use functional components and React Hooks.\n- Keep components small, pure, and focused on a single responsibility.\n- Avoid deeply nested prop-drilling; use Context or state management where appropriate.\n- Define explicit TypeScript interfaces for component props.\n`;
  }

  if (stackNames.includes('go')) {
    techSpecificRules += `\n## Go\n> Note: Auto-injected based on detected stack.\n- Follow \`gofmt\` formatting strictly.\n- Handle all errors explicitly (\`if err != nil\`). Do not ignore errors.\n- Keep interfaces small and define them where they are used.\n- Avoid package-level mutable state.\n`;
  }

  if (stackNames.includes('python')) {
    techSpecificRules += `\n## Python\n> Note: Auto-injected based on detected stack.\n- Follow PEP 8 formatting guidelines.\n- Use type hints (\`typing\`) everywhere.\n- Use Pydantic for data validation where applicable.\n`;
  }

  return readTemplate('init', 'engineering/coding-rules.md', { techSpecificRules });
}

export function testingRules(scan: ScanResult): string {
  const stackNames = scan.detectedStack.map(s => s.name.toLowerCase());
  let techSpecificRules = '';

  if (stackNames.includes('typescript') || stackNames.includes('node.js')) {
    techSpecificRules += `\n## TypeScript / Node.js Testing\n> Note: Auto-injected based on detected stack.\n- Use Jest or Vitest for testing.\n- Test core business logic independently of external I/O.\n- Mock network requests, file system, and database interactions in unit tests.\n`;
  }

  if (stackNames.includes('react') || stackNames.includes('next.js')) {
    techSpecificRules += `\n## React Testing\n> Note: Auto-injected based on detected stack.\n- Use React Testing Library.\n- Test user behavior and accessibility roles, not implementation details or internal state.\n`;
  }

  if (stackNames.includes('go')) {
    techSpecificRules += `\n## Go Testing\n> Note: Auto-injected based on detected stack.\n- Use the standard \`testing\` package.\n- Write table-driven tests for functions with multiple scenarios.\n- Use \`httptest\` for testing HTTP handlers without starting a real server.\n`;
  }

  if (stackNames.includes('python')) {
    techSpecificRules += `\n## Python Testing\n> Note: Auto-injected based on detected stack.\n- Use \`pytest\` as the primary testing framework.\n- Use fixtures for reusable setup and teardown logic.\n- Parameterize tests for multiple inputs.\n`;
  }

  return readTemplate('init', 'engineering/testing-rules.md', { techSpecificRules });
}

// ─── Architecture Templates ───

export function systemOverview(): string {
  return readTemplate('init', 'architecture/system-overview.md');
}

export function components(): string {
  return readTemplate('init', 'architecture/components.md');
}

// ─── Domain Templates ───

export function businessRules(): string {
  return readTemplate('init', 'domain/business-rules.md');
}

export function workflows(): string {
  return readTemplate('init', 'domain/workflows.md');
}

export function decisionTables(): string {
  return readTemplate('init', 'domain/decision-tables.md');
}

export function scenariosYaml(): string {
  return readTemplate('init', 'domain/scenarios.yaml');
}

// ─── ADR Templates ───

export function adrTemplate(number: number, title: string): string {
  const paddedNum = String(number).padStart(4, '0');
  return readTemplate('init', 'adr-template.md', { paddedNum, title });
}

export function initialAdr(): string {
  return readTemplate('init', 'adr/0001-initial-project-assumptions.md');
}

// ─── Case Templates ───

export function casesReadme(): string {
  return readTemplate('init', 'cases/README.md');
}

export function caseTemplate(title: string): string {
  return readTemplate('init', 'case-template.md', { title });
}

export function caseFromData(data: CaseData): string {
  const relatedSpecs = data.relatedSpecs.length > 0
    ? data.relatedSpecs.map(s => `- ${s}`).join('\n')
    : '<!-- No related specs -->';

  return readTemplate('init', 'case-from-data.md', {
    title: data.title,
    status: data.status,
    problem: data.problem,
    context: data.context,
    rootCause: data.rootCause,
    solution: data.solution,
    before: data.before || '<!-- Not provided -->',
    after: data.after || '<!-- Not provided -->',
    result: data.result,
    whenToReuse: data.whenToReuse,
    whenNotToUse: data.whenNotToUse,
    relatedSpecs,
    tags: data.tags.join(', ')
  });
}

// ─── AI Templates ───

export function aiInstructions(): string {
  return readTemplate('init', 'ai/instructions.md');
}

export function aiForbidden(): string {
  return readTemplate('init', 'ai/forbidden.md');
}

export function aiChecklist(): string {
  return readTemplate('init', 'ai/checklist.md');
}

// ─── Domain Rule Template ───

export function domainRuleTemplate(name: string): string {
  return readTemplate('init', 'domain-rule-template.md', { name });
}

// ─── Spec Template ───

export function specTemplate(name: string): string {
  return readTemplate('init', 'spec-template.md', { name });
}

// ─── .specmanignore Template ───

export function specmanIgnore(): string {
  return readTemplate('init', 'specmanignore');
}

// ─── Sync AI Instruction Templates ───

function caseCaptureProtocol(specsDir: string): string {
  return readTemplate('sync', 'case-capture-protocol.md', { specsDir });
}

function coreInstructions(specsDir: string, approvalNote: string): string {
  const caseCapture = caseCaptureProtocol(specsDir);
  return readTemplate('sync', 'core-instructions.md', {
    specsDir,
    approvalNote,
    caseCaptureProtocol: caseCapture
  });
}

export function generateSpecmanMd(specsDir: string, approvalNote: string): string {
  const core = coreInstructions(specsDir, approvalNote);
  return readTemplate('sync', 'SPECMAN.md', { specsDir, coreInstructions: core });
}

export function generateClaudeMd(specsDir: string, approvalNote: string): string {
  const core = coreInstructions(specsDir, approvalNote);
  return readTemplate('sync', 'CLAUDE.md', { coreInstructions: core });
}

export function generateAgentsMd(specsDir: string, approvalNote: string): string {
  const core = coreInstructions(specsDir, approvalNote);
  return readTemplate('sync', 'AGENTS.md', { coreInstructions: core });
}

export function generateCodexMd(specsDir: string, approvalNote: string): string {
  const core = coreInstructions(specsDir, approvalNote);
  return readTemplate('sync', 'CODEX.md', { coreInstructions: core });
}

export function generateCursorRules(specsDir: string, approvalNote: string): string {
  const core = coreInstructions(specsDir, approvalNote);
  return readTemplate('sync', 'cursor-rules.mdc', { coreInstructions: core });
}

export function generateCopilotInstructions(specsDir: string, approvalNote: string): string {
  const core = coreInstructions(specsDir, approvalNote);
  return readTemplate('sync', 'copilot-instructions.md', { coreInstructions: core });
}
