import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { initCommand } from '../../src/commands/init.js';
import { validateCommand } from '../../src/commands/validate.js';

describe('validate command', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'specman-validate-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('should exit when logic validation has no snapshot', async () => {
    await initCommand(tempDir);

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await expect(validateCommand(tempDir, { logic: true })).rejects.toThrow('process.exit called');
    expect(exitSpy).toHaveBeenCalledWith(1);

    logSpy.mockRestore();
    exitSpy.mockRestore();
  });

  it('should exit when snapshot update is requested without logic validation', async () => {
    await initCommand(tempDir);

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await expect(validateCommand(tempDir, { update: true })).rejects.toThrow('process.exit called');
    expect(exitSpy).toHaveBeenCalledWith(1);

    logSpy.mockRestore();
    exitSpy.mockRestore();
  });

  it('should update logic snapshot when requested', async () => {
    await initCommand(tempDir);
    await mkdir(join(tempDir, 'src'));
    await writeFile(join(tempDir, 'src', 'rules.ts'), 'export const important = true;\n', 'utf-8');

    const configPath = join(tempDir, '.specman', 'config.json');
    const config = JSON.parse(await readFile(configPath, 'utf-8'));
    config.logicLock.enabled = true;
    config.logicLock.paths = ['src/rules.ts'];
    await writeFile(configPath, JSON.stringify(config, null, 2) + '\n', 'utf-8');

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await validateCommand(tempDir, { logic: true, update: true });

    const snapshot = JSON.parse(await readFile(join(tempDir, '.specman', 'snapshots', 'logic-lock.json'), 'utf-8'));
    expect(snapshot.items).toHaveLength(1);
    expect(snapshot.items[0].path).toBe('src/rules.ts');

    logSpy.mockRestore();
  });

  it('should flag detected stack drift during review validation', async () => {
    await initCommand(tempDir);
    await writeFile(join(tempDir, 'package.json'), JSON.stringify({ dependencies: { express: '^4.0.0' } }), 'utf-8');

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await expect(validateCommand(tempDir, { review: true })).rejects.toThrow('process.exit called');
    expect(exitSpy).toHaveBeenCalledWith(1);
    const output = logSpy.mock.calls.flat().join('\n');
    expect(output).toContain('Detected Express');

    logSpy.mockRestore();
    exitSpy.mockRestore();
  });

  it('should warn when source files are newer than specs', async () => {
    await initCommand(tempDir);
    await new Promise(resolve => setTimeout(resolve, 5));
    await mkdir(join(tempDir, 'src'));
    await writeFile(join(tempDir, 'src', 'newer.ts'), 'export const newer = true;\n', 'utf-8');

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await validateCommand(tempDir, { review: true });

    expect(exitSpy).not.toHaveBeenCalled();
    const output = logSpy.mock.calls.flat().join('\n');
    expect(output).toContain('Source files are newer than spec files');

    logSpy.mockRestore();
    exitSpy.mockRestore();
  });
});
