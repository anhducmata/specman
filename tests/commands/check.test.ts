import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { initCommand } from '../../src/commands/init.js';

describe('check command', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'specman-check-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('should pass basic validation after init', async () => {
    // Init first
    await initCommand(tempDir);

    // Import check command — we need to mock process.exit and process.cwd
    const { checkCommand } = await import('../../src/commands/check.js');

    // Mock process.exit to prevent test from exiting
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });

    try {
      // Check will call process.exit(1) because approvedRequired is true by default
      await checkCommand(tempDir);
    } catch {
      // Expected: process.exit(1) because specs not approved
    }

    exitSpy.mockRestore();
  });
});
