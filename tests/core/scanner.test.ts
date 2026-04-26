import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { scanProject } from '../../src/core/scanner.js';

describe('scanner', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'specman-test-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('should detect Node.js from package.json', async () => {
    await writeFile(
      join(tempDir, 'package.json'),
      JSON.stringify({ name: 'test-project', description: 'A test', dependencies: {} }),
    );

    const result = await scanProject(tempDir);
    expect(result.detectedStack.some(t => t.name === 'Node.js')).toBe(true);
    expect(result.projectName).toBe('test-project');
    expect(result.projectDescription).toBe('A test');
  });

  it('should detect TypeScript from package.json devDependencies', async () => {
    await writeFile(
      join(tempDir, 'package.json'),
      JSON.stringify({
        name: 'ts-project',
        devDependencies: { typescript: '^5.0.0' },
      }),
    );

    const result = await scanProject(tempDir);
    expect(result.detectedStack.some(t => t.name === 'TypeScript')).toBe(true);
  });

  it('should detect Go from go.mod', async () => {
    await writeFile(
      join(tempDir, 'go.mod'),
      'module github.com/user/my-go-app\n\ngo 1.22\n',
    );

    const result = await scanProject(tempDir);
    expect(result.detectedStack.some(t => t.name === 'Go')).toBe(true);
    expect(result.projectName).toBe('my-go-app');
  });

  it('should detect Python from requirements.txt', async () => {
    await writeFile(join(tempDir, 'requirements.txt'), 'fastapi==0.100.0\nuvicorn\n');

    const result = await scanProject(tempDir);
    expect(result.detectedStack.some(t => t.name === 'Python')).toBe(true);
    expect(result.detectedStack.some(t => t.name === 'FastAPI')).toBe(true);
  });

  it('should detect Docker from Dockerfile', async () => {
    await writeFile(join(tempDir, 'Dockerfile'), 'FROM node:18\n');

    const result = await scanProject(tempDir);
    expect(result.hasDocker).toBe(true);
    expect(result.detectedStack.some(t => t.name === 'Docker')).toBe(true);
  });

  it('should detect CI from .github/workflows', async () => {
    await mkdir(join(tempDir, '.github', 'workflows'), { recursive: true });
    await writeFile(join(tempDir, '.github', 'workflows', 'ci.yml'), 'name: CI\n');

    const result = await scanProject(tempDir);
    expect(result.hasCi).toBe(true);
    expect(result.detectedStack.some(t => t.name === 'GitHub Actions')).toBe(true);
  });

  it('should detect tests directory', async () => {
    await mkdir(join(tempDir, 'tests'));

    const result = await scanProject(tempDir);
    expect(result.hasTests).toBe(true);
  });

  it('should return empty results for empty directory', async () => {
    const result = await scanProject(tempDir);
    expect(result.detectedStack).toHaveLength(0);
    expect(result.detectedFiles).toHaveLength(0);
    expect(result.projectName).toBeNull();
  });

  it('should detect React and Express from package.json', async () => {
    await writeFile(
      join(tempDir, 'package.json'),
      JSON.stringify({
        name: 'fullstack',
        dependencies: { react: '^18.0.0', express: '^4.0.0' },
      }),
    );

    const result = await scanProject(tempDir);
    expect(result.detectedStack.some(t => t.name === 'React')).toBe(true);
    expect(result.detectedStack.some(t => t.name === 'Express')).toBe(true);
  });
});
