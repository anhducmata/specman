import { dirname, join } from 'node:path';
import { readdir } from 'node:fs/promises';
import { loadConfig } from '../core/config.js';
import { listFilesRecursive, readTextFile, safeWriteFile, toKebabCase } from '../core/files.js';
import * as templates from '../core/templates.js';
import { icons } from '../core/ui.js';

type AddType = 'spec' | 'domain' | 'adr' | 'case' | 'rule';

/**
 * Add a new spec file (spec, domain, adr, case, or rule).
 */
export async function addCommand(
  root: string,
  type: string,
  name: string,
  force: boolean,
): Promise<void> {
  const validTypes: AddType[] = ['spec', 'domain', 'adr', 'case', 'rule'];

  if (!validTypes.includes(type as AddType)) {
    console.log(`${icons.error} Unknown type: "${type}". Supported types: ${validTypes.join(', ')}`);
    process.exit(1);
  }

  if (!name) {
    console.log(`${icons.error} Name is required. Usage: specman add ${type} <name>`);
    process.exit(1);
  }

  const config = await loadConfig(root);
  const specsDir = join(root, config.specsDir);
  const kebabName = toKebabCase(name);
  if (!kebabName) {
    console.log(`${icons.error} Name must include at least one letter or number.`);
    process.exit(1);
  }

  let filePath: string;
  let content: string;

  switch (type as AddType) {
    case 'spec': {
      filePath = join(specsDir, `${kebabName}.md`);
      content = templates.specTemplate(name);
      break;
    }
    case 'domain': {
      filePath = join(specsDir, 'domain', `${kebabName}.md`);
      content = templates.domainRuleTemplate(name);
      break;
    }
    case 'adr': {
      const nextNum = await getNextAdrNumber(join(specsDir, 'adr'));
      const paddedNum = String(nextNum).padStart(4, '0');
      filePath = join(specsDir, 'adr', `${paddedNum}-${kebabName}.md`);
      content = templates.adrTemplate(nextNum, name);
      break;
    }
    case 'case': {
      filePath = join(specsDir, 'cases', `${kebabName}.md`);
      content = templates.caseTemplate(name);
      break;
    }
    case 'rule': {
      filePath = join(specsDir, 'engineering', `${kebabName}.md`);
      content = templates.specTemplate(name);
      break;
    }
  }

  if (!force && await hasDuplicateTitle(filePath, name)) {
    console.log(`${icons.warn} A file with the same title already exists near: ${filePath}`);
    console.log('   Use --force only if you intentionally want another file for this title.');
    return;
  }

  const written = await safeWriteFile(filePath, content, force);

  if (written) {
    console.log(`${icons.success} Created: ${filePath}`);
  } else {
    console.log(`${icons.warn} File already exists: ${filePath}`);
    console.log('   Use --force to overwrite.');
  }
}

async function hasDuplicateTitle(filePath: string, title: string): Promise<boolean> {
  const dir = dirname(filePath);
  const normalizedTitle = normalizeTitle(title);
  const files = (await listFilesRecursive(dir)).filter(file => file.endsWith('.md'));

  for (const file of files) {
    const content = await readTextFile(file);
    if (!content) continue;

    const heading = content.split('\n').find(line => line.startsWith('# '));
    if (!heading) continue;

    const existingTitle = heading.replace(/^#\s+(Case:\s+|Domain Rule:\s+|ADR\s+\d+:\s+)?/i, '').trim();
    if (normalizeTitle(existingTitle) === normalizedTitle) {
      return true;
    }
  }

  return false;
}

function normalizeTitle(value: string): string {
  return toKebabCase(value);
}

/**
 * Determine the next ADR number by scanning existing ADR files.
 */
async function getNextAdrNumber(adrDir: string): Promise<number> {
  try {
    const entries = await readdir(adrDir);
    const numbers = entries
      .filter(e => e.endsWith('.md'))
      .map(e => {
        const match = e.match(/^(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter(n => n > 0);

    return numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
  } catch {
    return 1;
  }
}
