import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { initCommand } from '../../src/commands/init.js';
import { fileExists } from '../../src/core/files.js';

describe('init command', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'specman-init-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('should create specs directory structure', async () => {
    await initCommand(tempDir);

    // Check main spec files
    expect(await fileExists(join(tempDir, 'specs', '00-project-overview.md'))).toBe(true);
    expect(await fileExists(join(tempDir, 'specs', '01-detected-stack.md'))).toBe(true);
    expect(await fileExists(join(tempDir, 'specs', '02-assumptions.md'))).toBe(true);
    expect(await fileExists(join(tempDir, 'specs', '03-open-questions.md'))).toBe(true);
  });

  it('should create subdirectories', async () => {
    await initCommand(tempDir);

    expect(await fileExists(join(tempDir, 'specs', 'product', 'requirements.md'))).toBe(true);
    expect(await fileExists(join(tempDir, 'specs', 'engineering', 'coding-rules.md'))).toBe(true);
    expect(await fileExists(join(tempDir, 'specs', 'architecture', 'system-overview.md'))).toBe(true);
    expect(await fileExists(join(tempDir, 'specs', 'domain', 'business-rules.md'))).toBe(true);
    expect(await fileExists(join(tempDir, 'specs', 'adr', '0001-initial-project-assumptions.md'))).toBe(true);
    expect(await fileExists(join(tempDir, 'specs', 'cases', 'README.md'))).toBe(true);
    expect(await fileExists(join(tempDir, 'specs', 'ai', 'instructions.md'))).toBe(true);
  });

  it('should create .specman directory', async () => {
    await initCommand(tempDir);

    expect(await fileExists(join(tempDir, '.specman', 'config.json'))).toBe(true);
    expect(await fileExists(join(tempDir, '.specman', 'status.json'))).toBe(true);
  });

  it('should set initialized to true in status', async () => {
    await initCommand(tempDir);

    const status = JSON.parse(await readFile(join(tempDir, '.specman', 'status.json'), 'utf-8'));
    expect(status.initialized).toBe(true);
    expect(status.approved).toBe(false);
  });

  it('should create .specmanignore', async () => {
    await initCommand(tempDir);

    expect(await fileExists(join(tempDir, '.specmanignore'))).toBe(true);
  });

  it('should detect Node.js project', async () => {
    await writeFile(
      join(tempDir, 'package.json'),
      JSON.stringify({ name: 'my-app', dependencies: { express: '^4.0' } }),
    );

    await initCommand(tempDir);

    const stack = await readFile(join(tempDir, 'specs', '01-detected-stack.md'), 'utf-8');
    expect(stack).toContain('Node.js');
    expect(stack).toContain('Express');
  });

  it('should not overwrite existing files on second run', async () => {
    await initCommand(tempDir);

    // Modify a file
    const overviewPath = join(tempDir, 'specs', '00-project-overview.md');
    await writeFile(overviewPath, '# Custom Content');

    // Run init again
    await initCommand(tempDir);

    // File should not be overwritten
    const content = await readFile(overviewPath, 'utf-8');
    expect(content).toBe('# Custom Content');
  });

  it('should preserve existing config and approval status on re-init', async () => {
    await initCommand(tempDir);

    await writeFile(
      join(tempDir, '.specman', 'config.json'),
      JSON.stringify({
        version: 1,
        specsDir: 'knowledge',
        caseMaxBytes: 12000,
        approvedRequired: false,
        aiTools: {
          claude: true,
          codex: false,
          agents: true,
          cursor: true,
          copilot: true,
        },
        logicLock: {
          enabled: true,
          paths: ['src/**/*.ts'],
        },
      }),
    );
    await writeFile(
      join(tempDir, '.specman', 'status.json'),
      JSON.stringify({
        initialized: true,
        approved: true,
        approvedAt: '2026-01-01T00:00:00.000Z',
        approvedBy: 'tester',
      }),
    );

    await initCommand(tempDir);

    const status = JSON.parse(await readFile(join(tempDir, '.specman', 'status.json'), 'utf-8'));
    expect(status.approved).toBe(true);
    expect(status.approvedAt).toBe('2026-01-01T00:00:00.000Z');
    expect(status.approvedBy).toBe('tester');

    expect(await fileExists(join(tempDir, 'knowledge', '00-project-overview.md'))).toBe(true);
  });
});
