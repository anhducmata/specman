import { stat } from 'node:fs/promises';
import { join } from 'node:path';
import { loadConfig, loadStatus } from '../core/config.js';
import { listFilesRecursive, readTextFile, discoverSourceFiles, newestMtime } from '../core/files.js';
import { scanProject } from '../core/scanner.js';
import { createSnapshot, loadSnapshot, compareSnapshots } from '../core/hash.js';
import {
  icons,
  withLoader,
  printSection,
  printResults,
  printSummaryBox,
  printCallout,
  confirm,
  selectMenu,
  c,
  type ResultItem,
} from '../core/ui.js';
import {
  detectAvailableAssistants,
  runAssistantNonInteractive,
  gapPrompt,
  printManualPromptFallback,
  type AssistantCli,
} from '../core/ai.js';

interface GapOptions {
  ai?: boolean; // run AI deep analysis
}

/**
 * Show the gap between current specs and the actual codebase.
 * Phase 1 (always): fast local checks — stack drift, staleness, logic-lock.
 * Phase 2 (--ai or interactive prompt): AI-powered deep gap analysis (read-only).
 */
export async function gapCommand(root: string, options: GapOptions = {}): Promise<void> {
  const config = await loadConfig(root);
  const status = await loadStatus(root);

  if (!status.initialized) {
    console.log(`  ${icons.error}  specman has not been initialized. Run ${c.cyan('specman init')} first.`);
    process.exit(1);
  }

  const specsDir = join(root, config.specsDir);

  // ── Phase 1: Local gap check ──────────────────────────────────────────────
  printSection('Local Gap Analysis');

  const findings: ResultItem[] = [];

  await withLoader('Analysing specs vs code', async () => {
    // 1. Stack drift
    const scan = await scanProject(root);
    const detectedStack = await readTextFile(join(specsDir, '01-detected-stack.md'));

    if (!detectedStack) {
      findings.push({ severity: 'ERROR', message: `${config.specsDir}/01-detected-stack.md is missing.` });
    } else {
      for (const tech of scan.detectedStack) {
        if (!detectedStack.toLowerCase().includes(tech.name.toLowerCase())) {
          findings.push({
            severity: 'ERROR',
            message: `${c.bold(tech.name)} detected in code (from ${tech.source}) but missing from ${config.specsDir}/01-detected-stack.md`,
          });
        }
      }
    }

    // 2. Staleness: source files newer than spec files
    const sourceFiles = await discoverSourceFiles(root);
    const specFiles = (await listFilesRecursive(specsDir)).filter(
      (f) => f.endsWith('.md') || f.endsWith('.yaml') || f.endsWith('.yml'),
    );
    const newestSource = await newestMtime(sourceFiles);
    const newestSpec   = await newestMtime(specFiles);

    if (newestSource && newestSpec) {
      const diffMs = newestSource - newestSpec;
      if (diffMs > 0) {
        const diffMins = Math.round(diffMs / 60000);
        findings.push({
          severity: 'WARN',
          message: `Source files are ${c.yellowB(`${diffMins} minute(s)`)} newer than spec files — specs may be stale.`,
        });
      } else {
        findings.push({ severity: 'INFO', message: 'Spec files are up-to-date with source files.' });
      }
    }

    // 3. Empty / template-only spec files
    const keySpecs = [
      'domain/business-rules.md',
      'architecture/system-overview.md',
      'engineering/coding-rules.md',
      'product/requirements.md',
    ];
    for (const rel of keySpecs) {
      const content = await readTextFile(join(specsDir, rel));
      if (!content) {
        findings.push({ severity: 'WARN', message: `Spec file is missing: ${config.specsDir}/${rel}` });
        continue;
      }
      const stripped = content
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/^#+\s.*$/gm, '')
        .replace(/^>.*$/gm, '')
        .trim();
      if (stripped.length < 20) {
        findings.push({
          severity: 'WARN',
          message: `Spec file is empty/template-only: ${c.dim(config.specsDir + '/' + rel)}`,
        });
      }
    }

    // 4. Logic-lock drift
    const saved = await loadSnapshot(root);
    if (saved) {
      const current = await createSnapshot(root);
      const diff = compareSnapshots(saved, current);
      const driftCount = diff.changed.length + diff.added.length + diff.removed.length;
      if (driftCount > 0) {
        findings.push({
          severity: 'WARN',
          message: `Logic-lock drift: ${c.yellowB(String(driftCount))} file change(s) since last snapshot. Run ${c.cyan('specman validate --logic')} for details.`,
        });
      } else {
        findings.push({ severity: 'INFO', message: 'Logic-lock snapshot is current — no drift detected.' });
      }
    } else if (config.logicLock?.enabled) {
      findings.push({
        severity: 'INFO',
        message: `No logic-lock snapshot yet. Run ${c.cyan('specman validate --logic --update')} to create one.`,
      });
    }
  });

  printResults(findings);

  // Summary counters
  const errors   = findings.filter((f) => f.severity === 'ERROR').length;
  const warnings = findings.filter((f) => f.severity === 'WARN').length;
  printSummaryBox([
    { icon: icons.error, label: 'Spec errors',   value: errors,   color: errors   > 0 ? c.redB    : c.dim },
    { icon: icons.warn,  label: 'Spec warnings', value: warnings, color: warnings > 0 ? c.yellowB : c.dim },
  ]);

  // ── Phase 2: AI deep analysis ────────────────────────────────────────────
  await maybeRunAiGapAnalysis(root, specsDir, options);

  if (errors > 0) process.exit(1);
}

async function maybeRunAiGapAnalysis(
  root: string,
  specsDir: string,
  options: GapOptions,
): Promise<void> {
  let runAi = options.ai ?? false;

  if (!runAi) {
    // Ask interactively (only in TTY)
    const { isInteractiveTerminal } = await import('../core/ui.js');
    if (!isInteractiveTerminal()) return;

    printSection('AI Deep Analysis');
    console.log(`  ${icons.info}  Run an AI-powered gap analysis? ${c.dim('(read-only — no files will be modified)')}`);
    console.log();
    runAi = await confirm('Run AI gap analysis?');
    if (!runAi) return;
  }

  const available = await detectAvailableAssistants();

  if (available.length === 0) {
    printManualPromptFallback(gapPrompt(specsDir));
    return;
  }

  let chosen: AssistantCli = available[0];
  if (available.length > 1) {
    chosen = await selectMenu(
      'Choose AI CLI',
      available.map((a, i) => ({ key: String(i + 1), label: a, value: a })),
      chosen,
    );
  }

  printSection(`AI Gap Analysis — ${chosen}`);
  printCallout('info', [
    `${c.bold(chosen)} will read your specs and code`,
    c.dim('No files will be modified.'),
  ]);

  await runAssistantNonInteractive(root, chosen, gapPrompt(specsDir), false);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

