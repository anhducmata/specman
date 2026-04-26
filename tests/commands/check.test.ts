import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm, readFile, writeFile } from 'node:fs/promises';
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

  it('should validate after init without exiting', async () => {
    await initCommand(tempDir);

    const { checkCommand } = await import('../../src/commands/check.js');

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await checkCommand(tempDir);

    expect(exitSpy).not.toHaveBeenCalled();
    logSpy.mockRestore();
    exitSpy.mockRestore();
  });

  it('should report email as warning, not error', async () => {
    await initCommand(tempDir);

    const configPath = join(tempDir, '.specman', 'config.json');
    const config = JSON.parse(await readFile(configPath, 'utf-8'));
    config.approvedRequired = false;
    await writeFile(configPath, JSON.stringify(config, null, 2) + '\n', 'utf-8');

    const casePath = join(tempDir, 'specs', 'cases', 'contact-case.md');
    await writeFile(casePath, '# Contact\nEmail: team@example.com\n', 'utf-8');

    const { checkCommand } = await import('../../src/commands/check.js');

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await checkCommand(tempDir);

    expect(exitSpy).not.toHaveBeenCalled();
    const output = logSpy.mock.calls.flat().join('\n');
    expect(output).toContain('Potential Email Address');

    logSpy.mockRestore();
    exitSpy.mockRestore();
  });

  it('should exit when required spec files are missing', async () => {
    await initCommand(tempDir);
    await rm(join(tempDir, 'specs', '00-project-overview.md'));

    const { checkCommand } = await import('../../src/commands/check.js');

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await expect(checkCommand(tempDir)).rejects.toThrow('process.exit called');
    expect(exitSpy).toHaveBeenCalledWith(1);

    logSpy.mockRestore();
    exitSpy.mockRestore();
  });

  it('should warn when generated AI instructions and case sections are missing', async () => {
    await initCommand(tempDir);
    await rm(join(tempDir, 'SPECMAN.md'));
    await writeFile(join(tempDir, 'specs', 'cases', 'incomplete.md'), '# Case: Incomplete\n\n## Problem\nMissing sections\n', 'utf-8');

    const { checkCommand } = await import('../../src/commands/check.js');

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await checkCommand(tempDir);

    expect(exitSpy).not.toHaveBeenCalled();
    const output = logSpy.mock.calls.flat().join('\n');
    expect(output).toContain('Missing generated AI instruction file: SPECMAN.md');
    expect(output).toContain('Case file is missing required section ## Usage');

    logSpy.mockRestore();
    exitSpy.mockRestore();
  });

  it('should report real secrets as errors', async () => {
    await initCommand(tempDir);
    await writeFile(join(tempDir, 'specs', 'cases', 'secret.md'), '# Case: Secret\n\npassword = "mysecretpassword123"\n', 'utf-8');

    const { checkCommand } = await import('../../src/commands/check.js');

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await expect(checkCommand(tempDir)).rejects.toThrow('process.exit called');
    expect(exitSpy).toHaveBeenCalledWith(1);
    const output = logSpy.mock.calls.flat().join('\n');
    expect(output).toContain('Potential Password');

    logSpy.mockRestore();
    exitSpy.mockRestore();
  });
});
