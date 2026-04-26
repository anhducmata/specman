import { readFile } from 'node:fs/promises';
import { join, basename } from 'node:path';
import type { ScanResult, DetectedTech } from '../types.js';
import { fileExists } from './files.js';

// Files to scan for stack detection
const SCAN_FILES = [
  'package.json',
  'go.mod',
  'pyproject.toml',
  'requirements.txt',
  'Cargo.toml',
  'pom.xml',
  'build.gradle',
  'README.md',
  'Dockerfile',
  'docker-compose.yml',
  'docker-compose.yaml',
  'openapi.yaml',
  'openapi.yml',
  'swagger.yaml',
  'swagger.yml',
];

// Directories to check
const SCAN_DIRS = [
  'migrations',
  'tests',
  'test',
  'src',
  'app',
  'cmd',
  'internal',
  'lib',
  '.github/workflows',
];

/**
 * Scan a project directory to detect its technology stack.
 */
export async function scanProject(root: string): Promise<ScanResult> {
  const detectedFiles: string[] = [];
  const detectedStack: DetectedTech[] = [];

  // Check for known files
  for (const file of SCAN_FILES) {
    if (await fileExists(join(root, file))) {
      detectedFiles.push(file);
    }
  }

  // Check for known directories
  const dirChecks = {
    hasTests: false,
    hasSrc: false,
    hasDocker: false,
    hasCi: false,
    hasApi: false,
    hasMigrations: false,
  };

  for (const dir of SCAN_DIRS) {
    if (await fileExists(join(root, dir))) {
      detectedFiles.push(dir + '/');
      if (dir === 'migrations') dirChecks.hasMigrations = true;
      if (dir === 'tests' || dir === 'test') dirChecks.hasTests = true;
      if (dir === 'src' || dir === 'app' || dir === 'lib') dirChecks.hasSrc = true;
      if (dir === '.github/workflows') dirChecks.hasCi = true;
    }
  }

  if (detectedFiles.includes('Dockerfile') || detectedFiles.includes('docker-compose.yml') || detectedFiles.includes('docker-compose.yaml')) {
    dirChecks.hasDocker = true;
  }
  if (detectedFiles.includes('openapi.yaml') || detectedFiles.includes('openapi.yml') || detectedFiles.includes('swagger.yaml') || detectedFiles.includes('swagger.yml')) {
    dirChecks.hasApi = true;
  }

  // Detect technologies
  let projectName: string | null = null;
  let projectDescription: string | null = null;

  // Node.js / TypeScript / JavaScript frameworks
  if (detectedFiles.includes('package.json')) {
    try {
      const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf-8'));
      projectName = pkg.name || null;
      projectDescription = pkg.description || null;

      detectedStack.push({ name: 'Node.js', source: 'package.json', confidence: 'high' });

      const allDeps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };

      if (allDeps['typescript'] || await fileExists(join(root, 'tsconfig.json'))) {
        detectedStack.push({ name: 'TypeScript', source: 'package.json', confidence: 'high' });
      }

      // Frameworks
      if (allDeps['next']) detectedStack.push({ name: 'Next.js', source: 'package.json', confidence: 'high' });
      if (allDeps['react']) detectedStack.push({ name: 'React', source: 'package.json', confidence: 'high' });
      if (allDeps['vue']) detectedStack.push({ name: 'Vue.js', source: 'package.json', confidence: 'high' });
      if (allDeps['express']) detectedStack.push({ name: 'Express', source: 'package.json', confidence: 'high' });
      if (allDeps['@nestjs/core']) detectedStack.push({ name: 'NestJS', source: 'package.json', confidence: 'high' });
      if (allDeps['fastify']) detectedStack.push({ name: 'Fastify', source: 'package.json', confidence: 'high' });
      if (allDeps['hono']) detectedStack.push({ name: 'Hono', source: 'package.json', confidence: 'high' });

      // Databases
      if (allDeps['pg'] || allDeps['postgres'] || allDeps['@prisma/client'] || allDeps['typeorm']) {
        detectedStack.push({ name: 'PostgreSQL', source: 'package.json', confidence: 'medium' });
      }
      if (allDeps['mongoose'] || allDeps['mongodb']) {
        detectedStack.push({ name: 'MongoDB', source: 'package.json', confidence: 'medium' });
      }
      if (allDeps['redis'] || allDeps['ioredis']) {
        detectedStack.push({ name: 'Redis', source: 'package.json', confidence: 'medium' });
      }

      // Testing
      if (allDeps['jest'] || allDeps['vitest'] || allDeps['mocha']) {
        detectedStack.push({ name: 'Testing Framework', source: 'package.json', confidence: 'high' });
      }
    } catch {
      // Invalid package.json
    }
  }

  // Go
  if (detectedFiles.includes('go.mod')) {
    detectedStack.push({ name: 'Go', source: 'go.mod', confidence: 'high' });
    try {
      const gomod = await readFile(join(root, 'go.mod'), 'utf-8');
      if (!projectName) {
        const moduleMatch = gomod.match(/^module\s+(.+)$/m);
        if (moduleMatch) projectName = basename(moduleMatch[1].trim());
      }
    } catch {
      // Can't read go.mod
    }
  }

  // Python
  if (detectedFiles.includes('pyproject.toml') || detectedFiles.includes('requirements.txt')) {
    detectedStack.push({ name: 'Python', source: detectedFiles.includes('pyproject.toml') ? 'pyproject.toml' : 'requirements.txt', confidence: 'high' });
    if (detectedFiles.includes('requirements.txt')) {
      try {
        const reqs = await readFile(join(root, 'requirements.txt'), 'utf-8');
        if (reqs.includes('fastapi')) detectedStack.push({ name: 'FastAPI', source: 'requirements.txt', confidence: 'high' });
        if (reqs.includes('django')) detectedStack.push({ name: 'Django', source: 'requirements.txt', confidence: 'high' });
        if (reqs.includes('flask')) detectedStack.push({ name: 'Flask', source: 'requirements.txt', confidence: 'high' });
      } catch { /* ignore */ }
    }
  }

  // Rust
  if (detectedFiles.includes('Cargo.toml')) {
    detectedStack.push({ name: 'Rust', source: 'Cargo.toml', confidence: 'high' });
  }

  // Java
  if (detectedFiles.includes('pom.xml') || detectedFiles.includes('build.gradle')) {
    detectedStack.push({ name: 'Java', source: detectedFiles.includes('pom.xml') ? 'pom.xml' : 'build.gradle', confidence: 'high' });
  }

  // Docker
  if (dirChecks.hasDocker) {
    detectedStack.push({ name: 'Docker', source: 'Dockerfile', confidence: 'high' });
  }

  // CI
  if (dirChecks.hasCi) {
    detectedStack.push({ name: 'GitHub Actions', source: '.github/workflows/', confidence: 'high' });
  }

  // API spec
  if (dirChecks.hasApi) {
    detectedStack.push({ name: 'OpenAPI/Swagger', source: 'openapi spec', confidence: 'high' });
  }

  return {
    detectedFiles,
    detectedStack,
    ...dirChecks,
    projectName,
    projectDescription,
  };
}
