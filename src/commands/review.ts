import { join } from 'node:path';
import { readTextFile } from '../core/files.js';
import { loadStatus } from '../core/config.js';
import { icons } from '../core/ui.js';

/**
 * Review generated assumptions and detected stack.
 */
export async function reviewCommand(root: string): Promise<void> {
  const status = await loadStatus(root);

  if (!status.initialized) {
    console.log(`${icons.error} specman has not been initialized. Run \`specman init\` first.`);
    process.exit(1);
  }

  const specsDir = join(root, 'specs');

  // Print approval status
  if (status.approved) {
    console.log(`${icons.success} Specs are APPROVED (at ${status.approvedAt} by ${status.approvedBy})\n`);
  } else {
    console.log(`${icons.warn} Specs are NOT YET APPROVED — treat as draft assumptions only.\n`);
  }

  // Print detected stack
  console.log('Detected stack:');
  const stackContent = await readTextFile(join(specsDir, '01-detected-stack.md'));
  if (stackContent) {
    // Extract the Technologies section
    const techMatch = stackContent.match(/## Technologies\n([\s\S]*?)(?=\n## |$)/);
    if (techMatch) {
      console.log(techMatch[1].trim());
    } else {
      console.log(stackContent.trim());
    }
  } else {
    console.log('No detected stack file found.');
  }
  console.log();

  // Print assumptions
  console.log('Assumptions:');
  const assumptionsContent = await readTextFile(join(specsDir, '02-assumptions.md'));
  if (assumptionsContent) {
    // Print without the header and draft warning
    const lines = assumptionsContent.split('\n');
    const contentStart = lines.findIndex(l => l.startsWith('## '));
    if (contentStart >= 0) {
      console.log(lines.slice(contentStart).join('\n').trim());
    } else {
      console.log(assumptionsContent.trim());
    }
  } else {
    console.log('No assumptions file found.');
  }
  console.log();

  // Print open questions
  console.log('Open questions:');
  const questionsContent = await readTextFile(join(specsDir, '03-open-questions.md'));
  if (questionsContent) {
    const lines = questionsContent.split('\n');
    const contentStart = lines.findIndex(l => l.startsWith('## '));
    if (contentStart >= 0) {
      console.log(lines.slice(contentStart).join('\n').trim());
    } else {
      console.log(questionsContent.trim());
    }
  } else {
    console.log('No open questions file found.');
  }
  console.log();

  // Print action items
  console.log('Review checklist:');
  console.log('  1. Verify detected stack is correct');
  console.log('  2. Confirm or correct each assumption');
  console.log('  3. Answer open questions');
  console.log('  4. Add missing domain rules to specs/domain/');
  console.log('  5. Add architecture details to specs/architecture/');
  console.log();

  if (!status.approved) {
    console.log('-> When done reviewing, run `specman approve` to mark specs as approved.');
  }
}
