import { stat } from 'node:fs/promises';
import { join } from 'node:path';
import { createSnapshot, loadSnapshot, compareSnapshots } from '../core/hash.js';
import { loadConfig } from '../core/config.js';
import { listFilesRecursive, readTextFile, discoverSourceFiles, newestMtime } from '../core/files.js';
import { scanProject } from '../core/scanner.js';
import { icons, withLoader, printResults, printSection, c, type ResultItem } from '../core/ui.js';
import { checkCommand } from './check.js';
import { snapshotCommand } from './snapshot.js';

interface ValidateOptions {
  logic?: boolean;
  review?: boolean;
  update?: boolean;
}

/**
 * Validate logic-lock: compare current hashes with saved snapshot.
 */
export async function validateCommand(root: string, options: ValidateOptions | boolean = {}): Promise<void> {
  const normalized = typeof options === 'boolean' ? { logic: options } : options;

  if (normalized.review) {
    await validateReview(root);
    return;
  }

  if (normalized.update && !normalized.logic) {
    console.log(`  ${icons.error}  Use \`specman validate --logic --update\` to update a logic-lock snapshot.`);
    process.exit(1);
  }

  if (!normalized.logic) {
    await checkCommand(root);
    return;
  }

  if (normalized.update) {
    await snapshotCommand(root);
    return;
  }

  const config = await loadConfig(root);

  if (!config.logicLock.enabled) {
    console.log(`  ${icons.info}  Logic-lock is disabled in .specman/config.json.`);
    return;
  }

  const saved = await loadSnapshot(root);
  if (!saved) {
    console.log(`  ${icons.error}  No logic-lock snapshot found.`);
    console.log(`  Run ${c.cyan('specman validate --logic --update')} to create one after reviewing the configured paths.`);
    process.exit(1);
  }

  const result = await withLoader('Validating logic-lock', async () => {
    const current = await createSnapshot(root);
    const diff = compareSnapshots(saved, current);
    return diff;
  });

  const hasChanges = result.changed.length > 0 || result.added.length > 0 || result.removed.length > 0;

  if (!hasChanges) {
    console.log(`  ${icons.success}  ${c.greenB('No changes detected. Logic-lock is intact.')}`);
    return;
  }

  // Report changes
  if (result.changed.length > 0) {
    printSection('Changed Files');
    for (const ch of result.changed) {
      console.log(`  ${icons.warn}  ${ch.item.path}`);
      console.log(`     ${c.dim('old:')} ${c.dim(ch.oldHash.substring(0, 16))}${c.dim('...')}`);
      console.log(`     ${c.dim('new:')} ${c.yellow(ch.newHash.substring(0, 16))}${c.dim('...')}`);
    }
  }

  if (result.added.length > 0) {
    printSection('New Files');
    for (const a of result.added) {
      console.log(`  ${icons.info}  ${c.cyanB(a.path)}`);
    }
  }

  if (result.removed.length > 0) {
    printSection('Removed Files');
    for (const r of result.removed) {
      console.log(`  ${icons.error}  ${c.dim(r.path)}`);
    }
  }

  printSection('Recommendations');
  console.log(`  ${c.bold(c.cyanB('1'))}  Review changed files to confirm they are expected`);
  console.log(`  ${c.bold(c.cyanB('2'))}  Run domain scenario tests if applicable`);
  console.log(`  ${c.bold(c.cyanB('3'))}  Run ${c.cyan('specman validate --logic --update')} to update the snapshot if changes are approved`);
  console.log();
}

async function validateReview(root: string): Promise<void> {
  const config = await loadConfig(root);
  const specsDir = join(root, config.specsDir);
  const findings: { severity: 'ERROR' | 'WARN' | 'INFO'; message: string }[] = [];

  await withLoader('Reviewing code/spec freshness', async () => {
    const scan = await scanProject(root);
    const detectedStack = await readTextFile(join(specsDir, '01-detected-stack.md'));

    if (!detectedStack) {
      findings.push({ severity: 'ERROR', message: `${config.specsDir}/01-detected-stack.md is missing.` });
    } else {
      for (const tech of scan.detectedStack) {
        if (!detectedStack.toLowerCase().includes(tech.name.toLowerCase())) {
          findings.push({
            severity: 'ERROR',
            message: `Detected ${tech.name} from ${tech.source}, but it is not documented in ${config.specsDir}/01-detected-stack.md.`,
          });
        }
      }
    }

    const sourceFiles = await discoverSourceFiles(root);
    const specFiles = (await listFilesRecursive(specsDir)).filter(file => file.endsWith('.md') || file.endsWith('.yaml') || file.endsWith('.yml'));
    const newestSource = await newestMtime(sourceFiles);
    const newestSpec = await newestMtime(specFiles);

    if (newestSource && newestSpec && newestSource > newestSpec) {
      findings.push({
        severity: 'WARN',
        message: 'Source files are newer than spec files. Specs may need refresh.',
      });
    }

    const saved = await loadSnapshot(root);
    if (saved) {
      const current = await createSnapshot(root);
      const diff = compareSnapshots(saved, current);
      const changedCount = diff.changed.length + diff.added.length + diff.removed.length;
      if (changedCount > 0) {
        findings.push({
          severity: 'WARN',
          message: `Logic-lock drift detected (${changedCount} file change(s)). Run \`specman validate --logic\` for details.`,
        });
      }
    } else if (config.logicLock.enabled) {
      findings.push({
        severity: 'INFO',
        message: 'No logic-lock snapshot found. Run `specman validate --logic --update` to enable stronger code/spec drift checks.',
      });
    }
  });

  printResults(findings as ResultItem[]);

  if (findings.some(finding => finding.severity === 'ERROR')) {
    process.exit(1);
  }
}

