import { spawn, execFile } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { icons, c, printSection, printCallout, withLoader } from './ui.js';

export type AssistantCli = 'claude' | 'codex' | 'cursor';

const ASSISTANTS: AssistantCli[] = ['claude', 'codex', 'cursor'];

// ─── Detection ────────────────────────────────────────────────────────────────

export function normalizeAssistant(value?: string): AssistantCli | null {
  if (!value) return null;
  const normalized = value.toLowerCase();
  return ASSISTANTS.includes(normalized as AssistantCli) ? (normalized as AssistantCli) : null;
}

export function suggestAssistant(value?: string): AssistantCli | null {
  if (!value) return null;
  const normalized = value.toLowerCase().trim();
  const exact = normalizeAssistant(normalized);
  if (exact) return exact;

  const prefixMatch = ASSISTANTS.find(
    (a) => a.startsWith(normalized) || normalized.startsWith(a),
  );
  if (prefixMatch) return prefixMatch;

  let best: { assistant: AssistantCli; distance: number } | null = null;
  for (const assistant of ASSISTANTS) {
    const distance = levenshtein(normalized, assistant);
    if (best === null || distance < best.distance) {
      best = { assistant, distance };
    }
  }
  return best && best.distance <= 2 ? best.assistant : null;
}

/**
 * Detect which AI CLI tools are available in PATH.
 */
export async function detectAvailableAssistants(): Promise<AssistantCli[]> {
  const checks: Array<{ name: AssistantCli; bin: string }> = [
    { name: 'claude', bin: 'claude' },
    { name: 'codex',  bin: 'codex'  },
  ];

  const results = await Promise.all(
    checks.map(async ({ name, bin }) => {
      const found = await isCommandAvailable(bin);
      return found ? name : null;
    }),
  );

  return results.filter((r): r is AssistantCli => r !== null);
}

function isCommandAvailable(command: string): Promise<boolean> {
  return new Promise((resolve) => {
    execFile('which', [command], (err) => resolve(!err));
  });
}

// ─── Runner ───────────────────────────────────────────────────────────────────

export async function runAssistant(root: string, assistant: AssistantCli, prompt: string): Promise<void> {
  if (assistant === 'cursor') {
    console.log(`  ${icons.warn}  Cursor does not expose a stable local CLI for this workflow.`);
    console.log(`  Use this prompt in Cursor Agent instead:\n`);
    console.log(prompt);
    return;
  }

  const { command, args } = buildCommand(assistant, prompt);
  console.log();
  console.log(`  ${icons.info}  Running ${c.cyan(command)} in ${c.dim(root)} …`);
  console.log();

  await spawnInherited(command, args, root);
}

/**
 * Run an AI CLI in non-interactive / full-auto mode.
 * Used by sync --specs-to-code, sync --code-to-specs, gap --ai.
 */
export async function runAssistantNonInteractive(
  root: string,
  assistant: AssistantCli,
  prompt: string,
  allowWrites: boolean,
  spinnerLabel?: string,
): Promise<void> {
  if (assistant === 'cursor') {
    printManualPromptFallback(prompt);
    return;
  }

  const { command, args } = buildNonInteractiveCommand(assistant, prompt, allowWrites);
  
  if (spinnerLabel) {
    await withLoader(spinnerLabel, () => spawnHidden(command, args, root));
  } else {
    console.log();
    console.log(`  ${icons.info}  Running ${c.cyan(command)} ${c.dim('(non-interactive)')} …`);
    console.log();
    await spawnInherited(command, args, root);
  }
}

/**
 * Build the correct invocation for a given assistant in interactive mode.
 */
function buildCommand(assistant: AssistantCli, prompt: string): { command: string; args: string[] } {
  switch (assistant) {
    case 'claude':
      // claude -p "prompt" --dangerously-skip-permissions
      return { command: 'claude', args: ['-p', prompt, '--dangerously-skip-permissions'] };
    case 'codex':
      // codex exec "prompt" with disk read+write permissions
      return {
        command: 'codex',
        args: [
          'exec',
          '-c', 'sandbox_permissions=["disk-full-read-access","disk-write-access"]',
          prompt,
        ],
      };
    default:
      return { command: assistant, args: [prompt] };
  }
}

/**
 * Build the correct invocation for a given assistant in non-interactive / headless mode.
 */
function buildNonInteractiveCommand(
  assistant: AssistantCli,
  prompt: string,
  allowWrites: boolean,
): { command: string; args: string[] } {
  switch (assistant) {
    case 'claude': {
      const args = ['-p', prompt, '--dangerously-skip-permissions'];
      return { command: 'claude', args };
    }
    case 'codex': {
      const perms = allowWrites
        ? '["disk-full-read-access","disk-write-access","network-outbound-disabled"]'
        : '["disk-full-read-access","network-outbound-disabled"]';
      return {
        command: 'codex',
        args: ['exec', '-c', `sandbox_permissions=${perms}`, prompt],
      };
    }
    default:
      return { command: assistant, args: [prompt] };
  }
}

function spawnInherited(command: string, args: string[], cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: 'inherit' });
    child.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') {
        console.log(`  ${icons.error}  ${c.redB(command)} CLI was not found in PATH.`);
        console.log(`  Install it or use ${c.cyan('specman init --prompt')} to print the prompt instead.`);
        resolve();
        return;
      }
      reject(error);
    });
    child.on('close', (code) => {
      if (code && code !== 0) {
        reject(new Error(`${command} exited with code ${code}`));
        return;
      }
      resolve();
    });
  });
}

function spawnHidden(command: string, args: string[], cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: 'ignore' });
    child.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') {
        console.log(`\n  ${icons.error}  ${c.redB(command)} CLI was not found in PATH.`);
        console.log(`  Install it or use ${c.cyan('specman init --prompt')} to print the prompt instead.`);
        resolve();
        return;
      }
      reject(error);
    });
    child.on('close', (code) => {
      if (code && code !== 0) {
        reject(new Error(`${command} exited with code ${code}`));
        return;
      }
      resolve();
    });
  });
}

// ─── Manual fallback ──────────────────────────────────────────────────────────

export function printManualPromptFallback(prompt: string): void {
  printSection('Manual Prompt');
  printCallout('info', [
    'No AI CLI found — copy and paste this prompt into any AI tool:',
  ]);
  console.log(prompt);
  console.log();
}

// ─── Prompts ──────────────────────────────────────────────────────────────────

function readPrompt(filename: string, specsDir?: string): string {
  try {
    const currentDir = dirname(fileURLToPath(import.meta.url));
    const promptsDir = join(currentDir, '..', '..', 'prompts');
    let content = readFileSync(join(promptsDir, filename), 'utf-8');
    if (specsDir) {
      content = content.replace(/\{\{specsDir\}\}/g, specsDir);
    }
    return content.trim();
  } catch (error) {
    console.error(`  ${icons.error}  Failed to load prompt ${filename}:`, error);
    return 'Error loading prompt.';
  }
}

/**
 * Prompt to fill specs from scratch (used by specman init / specman init --with <tool>).
 */
export function specsPrompt(): string {
  return readPrompt('commands/specs.md');
}

/**
 * Prompt for specman sync --code-to-specs:
 * AI reads the current code and updates specs to reflect reality.
 */
export function codeToSpecsPrompt(specsDir: string): string {
  return readPrompt('commands/code-to-specs.md', specsDir);
}

/**
 * Prompt for specman sync --specs-to-code:
 * AI reads the specs and implements them into the codebase.
 */
export function specsToCodePrompt(specsDir: string): string {
  return readPrompt('commands/specs-to-code.md', specsDir);
}

/**
 * Prompt for specman gap --ai:
 * AI reads both specs and code, reports gaps — does NOT modify anything.
 */
export function gapPrompt(specsDir: string): string {
  return readPrompt('commands/gap.md', specsDir);
}

/**
 * Prompt for specman run (Planning Phase):
 * Instructs the AI to break down a goal into a markdown checklist.
 */
export function autoPlanPrompt(specsDir: string, goal: string): string {
  let content = readPrompt('commands/auto-plan.md', specsDir);
  return content.replace(/\{\{goal\}\}/g, goal);
}

/**
 * Prompt for specman run (Execution Phase):
 * Instructs the AI to execute a single step from the plan.
 */
export function autoStepPrompt(
  specsDir: string,
  goal: string,
  currentStep: string,
  planContent: string
): string {
  let content = readPrompt('commands/auto-step.md', specsDir);
  content = content.replace(/\{\{goal\}\}/g, goal);
  content = content.replace(/\{\{currentStep\}\}/g, currentStep);
  content = content.replace(/\{\{planContent\}\}/g, planContent);
  return content;
}

// ─── Levenshtein ──────────────────────────────────────────────────────────────

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const curr = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j];
  }
  return prev[b.length];
}
