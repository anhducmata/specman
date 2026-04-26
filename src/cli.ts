#!/usr/bin/env node

import { Command } from 'commander';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { initCommand } from './commands/init.js';
import { syncCommand } from './commands/sync.js';
import { validateCommand } from './commands/validate.js';
import { removeCommand } from './commands/remove.js';
import { gapCommand } from './commands/gap.js';

const program = new Command();
const currentDir = dirname(fileURLToPath(import.meta.url));
const packageVersion = readPackageVersion(currentDir);

program
  .name('specman')
  .description('AI-first spec management CLI for software teams')
  .version(packageVersion);

// ─── specman init ───
program
  .command('init')
  .option('--with <assistant>', 'Ask a local AI CLI to fill specs: claude, codex, cursor')
  .option('--prompt', 'Print a prompt for filling specs instead of asking interactively')
  .option('--skip-ai', 'Create files only; skip the interactive AI prompt')
  .description('Create specs structure and AI tool rules')
  .action(async (options: { with?: string; prompt?: boolean; skipAi?: boolean }) => {
    await initCommand(process.cwd(), {
      assistant: options.with,
      prompt: !!options.prompt,
      noPrompt: !!options.skipAi,
    });
  });

// ─── specman sync ───
program
  .command('sync')
  .option('--check', 'Show sync status without writing files')
  .option('--yes', 'Apply changes without confirmation', false)
  .option('--code-to-specs', 'Use AI to read the codebase and update spec files')
  .option('--specs-to-code', 'Use AI to read specs and implement them into source code')
  .description('Update AI tool rules from the current specs, or sync specs ↔ code via AI')
  .action(async (options: {
    check?: boolean;
    yes?: boolean;
    codeToSpecs?: boolean;
    specsToCode?: boolean;
  }) => {
    await syncCommand(process.cwd(), 'all', {
      check: !!options.check,
      yes: !!options.yes,
      codeToSpecs: !!options.codeToSpecs,
      specsToCode: !!options.specsToCode,
    });
  });

// ─── specman validate ───
program
  .command('validate')
  .option('--review', 'Review whether specs still match the current code')
  .option('--logic', 'Compare current hashes with logic-lock snapshot')
  .option('--update', 'Update the logic-lock snapshot when used with --logic')
  .description('Validate specs, AI rules, solved cases, or code/spec freshness')
  .action(async (options: { review?: boolean; logic?: boolean; update?: boolean }) => {
    await validateCommand(process.cwd(), {
      review: !!options.review,
      logic: !!options.logic,
      update: !!options.update,
    });
  });

// ─── specman gap ───
program
  .command('gap')
  .option('--ai', 'Run an AI-powered deep gap analysis after the local check')
  .description('Show the gap between current specs and actual code (local check + optional AI analysis)')
  .action(async (options: { ai?: boolean }) => {
    await gapCommand(process.cwd(), { ai: !!options.ai });
  });

// ─── specman remove ───
program
  .command('remove')
  .option('--yes', 'Actually remove files after previewing them', false)
  .description('Safely remove specman-managed files from this repository')
  .action(async (options: { yes?: boolean }) => {
    await removeCommand(process.cwd(), options);
  });

program.parse();

function readPackageVersion(cliDir: string): string {
  try {
    const packageJsonPath = join(cliDir, '..', 'package.json');
    const content = readFileSync(packageJsonPath, 'utf-8');
    const parsed = JSON.parse(content) as { version?: string };
    return parsed.version || '0.0.0';
  } catch {
    return '0.0.0';
  }
}
