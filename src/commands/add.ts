import { join } from 'node:path';
import { readdir } from 'node:fs/promises';
import { loadConfig } from '../core/config.js';
import { safeWriteFile, toKebabCase } from '../core/files.js';
import * as templates from '../core/templates.js';

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
    console.log(`❌ Unknown type: "${type}". Supported types: ${validTypes.join(', ')}`);
    process.exit(1);
  }

  if (!name) {
    console.log(`❌ Name is required. Usage: specman add ${type} <name>`);
    process.exit(1);
  }

  const config = await loadConfig(root);
  const specsDir = join(root, config.specsDir);
  const kebabName = toKebabCase(name);

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

  const written = await safeWriteFile(filePath, content, force);

  if (written) {
    console.log(`✅ Created: ${filePath}`);
  } else {
    console.log(`⚠️  File already exists: ${filePath}`);
    console.log('   Use --force to overwrite.');
  }
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
