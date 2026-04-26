import { join } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { loadConfig } from '../core/config.js';
import { safeWriteFile, toKebabCase } from '../core/files.js';
import { caseFromData } from '../core/templates.js';
import { redactSecrets, hasSecrets } from '../core/redactor.js';
import { icons } from '../core/ui.js';
import type { CaseData } from '../types.js';

/**
 * Interactively capture a solved problem into a solved case.
 */
export async function captureCommand(root: string): Promise<void> {
  const config = await loadConfig(root);
  const rl = createInterface({ input: stdin, output: stdout });

  console.log('Capture a Solved Case\n');
  console.log('Answer the following questions. Press Enter to skip optional fields.\n');

  try {
    const title = await askRequired(rl, 'Title (required): ');
    const problem = await askRequired(rl, 'Problem description (required): ');
    const context = await ask(rl, 'Context (safe info only, no secrets/PII): ');
    const rootCause = await ask(rl, 'Root cause: ');
    const solution = await askRequired(rl, 'Solution (required): ');
    const before = await ask(rl, 'Before (optional snippet/summary): ');
    const after = await ask(rl, 'After (optional snippet/summary): ');
    const result = await ask(rl, 'Result (impact after fix): ');
    const whenToReuse = await ask(rl, 'When to reuse this solution: ');
    const whenNotToUse = await ask(rl, 'When NOT to use this solution: ');
    const relatedSpecsRaw = await ask(rl, 'Related specs (comma-separated paths): ');
    const tagsRaw = await ask(rl, 'Tags (comma-separated): ');

    const relatedSpecs = relatedSpecsRaw
      ? relatedSpecsRaw.split(',').map(s => s.trim()).filter(Boolean)
      : [];
    const tags = tagsRaw
      ? tagsRaw.split(',').map(s => s.trim()).filter(Boolean)
      : [];

    const caseData: CaseData = {
      title,
      status: 'Draft',
      problem,
      context: context || '<!-- Not provided -->',
      rootCause: rootCause || '<!-- Not provided -->',
      solution,
      before,
      after,
      result: result || '<!-- Not provided -->',
      whenToReuse: whenToReuse || '<!-- Not provided -->',
      whenNotToUse: whenNotToUse || '<!-- Not provided -->',
      relatedSpecs,
      tags,
    };

    // Generate content
    let content = caseFromData(caseData);

    // Check for secrets
    if (hasSecrets(content)) {
      console.log(`\n${icons.warn} Potential secrets detected! Redacting before saving...`);
      content = redactSecrets(content);
    }

    // Check size
    const sizeBytes = Buffer.byteLength(content, 'utf-8');
    if (sizeBytes > config.caseMaxBytes) {
      console.log(`\n${icons.warn} Case is large (${sizeBytes} bytes > ${config.caseMaxBytes} limit).`);
      console.log('   Consider summarizing to reduce size.');
    }

    // Save
    const kebabTitle = toKebabCase(title);
    const filePath = join(root, config.specsDir, 'cases', `${kebabTitle}.md`);
    const written = await safeWriteFile(filePath, content);

    if (written) {
      console.log(`\n${icons.success} Case saved: ${filePath}`);
      console.log('   Status: Draft (review and update as needed)');
    } else {
      console.log(`\n${icons.warn} File already exists: ${filePath}`);
      console.log('   Use `specman add case` with --force to overwrite.');
    }
  } finally {
    rl.close();
  }
}

async function ask(rl: ReturnType<typeof createInterface>, question: string): Promise<string> {
  const answer = await rl.question(question);
  return answer.trim();
}

async function askRequired(rl: ReturnType<typeof createInterface>, question: string): Promise<string> {
  let answer = '';
  while (!answer) {
    answer = (await rl.question(question)).trim();
    if (!answer) {
      console.log('   This field is required. Please provide a value.');
    }
  }
  return answer;
}
