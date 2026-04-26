#!/usr/bin/env node

import { Command } from 'commander';
import { initCommand } from './commands/init.js';
import { reviewCommand } from './commands/review.js';
import { approveCommand } from './commands/approve.js';
import { syncCommand } from './commands/sync.js';
import { promptCommand } from './commands/prompt.js';
import { summaryCommand } from './commands/summary.js';
import { addCommand } from './commands/add.js';
import { checkCommand } from './commands/check.js';
import { searchCommand } from './commands/search.js';
import { captureCommand } from './commands/capture.js';
import { snapshotCommand } from './commands/snapshot.js';
import { validateCommand } from './commands/validate.js';

const program = new Command();

program
  .name('specman')
  .description('AI-first spec management CLI for software teams')
  .version('0.1.1');

// ─── specman init ───
program
  .command('init')
  .description('Scan the current project and create specs structure')
  .action(async () => {
    await initCommand(process.cwd());
  });

// ─── specman review ───
program
  .command('review')
  .description('Print generated assumptions, detected stack, and open questions')
  .action(async () => {
    await reviewCommand(process.cwd());
  });

// ─── specman approve ───
program
  .command('approve')
  .description('Mark generated specs as approved source of truth')
  .action(async () => {
    await approveCommand(process.cwd());
  });

// ─── specman sync <target> ───
program
  .command('sync')
  .argument('<target>', 'Sync target (use "all")')
  .description('Generate AI tool instruction files')
  .action(async (target: string) => {
    await syncCommand(process.cwd(), target);
  });

// ─── specman prompt ───
program
  .command('prompt')
  .description('Print a reusable prompt for AI coding tools')
  .action(async () => {
    await promptCommand(process.cwd());
  });

// ─── specman summary ───
program
  .command('summary')
  .description('Generate a short project context summary for AI')
  .action(async () => {
    await summaryCommand(process.cwd());
  });

// ─── specman add <type> <name> ───
program
  .command('add')
  .argument('<type>', 'Type: spec, domain, adr, case, rule')
  .argument('<name>', 'Name or title for the new file')
  .option('-f, --force', 'Overwrite existing files', false)
  .description('Add a new spec file')
  .action(async (type: string, name: string, options: { force: boolean }) => {
    await addCommand(process.cwd(), type, name, options.force);
  });

// ─── specman check ───
program
  .command('check')
  .description('Validate spec structure and detect issues')
  .action(async () => {
    await checkCommand(process.cwd());
  });

// ─── specman search <query> ───
program
  .command('search')
  .argument('<query>', 'Search query')
  .description('Search specs, ADRs, domain rules, and solved cases')
  .action(async (query: string) => {
    await searchCommand(process.cwd(), query);
  });

// ─── specman capture ───
program
  .command('capture')
  .description('Interactively capture a solved problem into a case')
  .action(async () => {
    await captureCommand(process.cwd());
  });

// ─── specman snapshot ───
program
  .command('snapshot')
  .description('Create/update logic-lock fingerprints')
  .action(async () => {
    await snapshotCommand(process.cwd());
  });

// ─── specman validate ───
program
  .command('validate')
  .option('--logic', 'Compare current hashes with logic-lock snapshot')
  .description('Validate project against specs and logic-lock')
  .action(async (options: { logic?: boolean }) => {
    await validateCommand(process.cwd(), !!options.logic);
  });

program.parse();
