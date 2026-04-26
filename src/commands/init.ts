import { join } from 'node:path';
import { scanProject } from '../core/scanner.js';
import { loadConfig, loadStatus, saveConfig, saveStatus, ensureSpecmanDir } from '../core/config.js';
import { safeWriteFile } from '../core/files.js';
import * as templates from '../core/templates.js';
import {
  withLoader,
  icons,
  isInteractiveTerminal,
  printBanner,
  printSection,
  printBullet,
  printTree,
  printSummaryBox,
  printCallout,
  selectMenu,
  c,
} from '../core/ui.js';
import { syncCommand } from './sync.js';
import { normalizeAssistant, runAssistant, specsPrompt, suggestAssistant, type AssistantCli } from '../core/ai.js';

interface InitOptions {
  assistant?: string;
  prompt?: boolean;
  noPrompt?: boolean;
}

/**
 * Initialize specman in the current project.
 * Scans the project, creates specs structure, generates draft assumptions.
 */
export async function initCommand(root: string, options: InitOptions = {}): Promise<void> {
  // Read version from package.json
  let version = '';
  try {
    const { readFileSync } = await import('node:fs');
    const { dirname, join: pjoin } = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    const dir = dirname(fileURLToPath(import.meta.url));
    const pkg = JSON.parse(readFileSync(pjoin(dir, '..', '..', 'package.json'), 'utf-8')) as { version?: string };
    version = pkg.version ?? '';
  } catch { /* ignore */ }

  printBanner(version);

  const config = await loadConfig(root);
  const status = await loadStatus(root);
  const scan   = await withLoader('Scanning project', () => scanProject(root));
  const specsDir = join(root, config.specsDir);

  // ── Detected Stack ──
  printSection('Detected Stack');
  if (scan.detectedStack.length > 0) {
    for (const tech of scan.detectedStack) {
      printBullet(c.bold(tech.name), `from ${tech.source}`);
    }
  } else {
    console.log(`  ${icons.warn}  No technologies detected — add them manually later.`);
  }

  // Create .specman directory
  await ensureSpecmanDir(root);

  // Define all files to create
  const files: { path: string; content: string }[] = [
    // Root specs
    { path: join(specsDir, '00-project-overview.md'),  content: templates.projectOverview(scan) },
    { path: join(specsDir, '01-detected-stack.md'),    content: templates.detectedStack(scan) },
    { path: join(specsDir, '02-assumptions.md'),       content: templates.assumptions(scan) },
    { path: join(specsDir, '03-open-questions.md'),    content: templates.openQuestions() },
    // Product
    { path: join(specsDir, 'product', 'requirements.md'), content: templates.productRequirements() },
    // Engineering
    { path: join(specsDir, 'engineering', 'coding-rules.md'),  content: templates.codingRules() },
    { path: join(specsDir, 'engineering', 'testing-rules.md'), content: templates.testingRules() },
    // Architecture
    { path: join(specsDir, 'architecture', 'system-overview.md'), content: templates.systemOverview() },
    { path: join(specsDir, 'architecture', 'components.md'),       content: templates.components() },
    // Domain
    { path: join(specsDir, 'domain', 'business-rules.md'),   content: templates.businessRules() },
    { path: join(specsDir, 'domain', 'workflows.md'),         content: templates.workflows() },
    { path: join(specsDir, 'domain', 'decision-tables.md'),   content: templates.decisionTables() },
    { path: join(specsDir, 'domain', 'scenarios.yaml'),       content: templates.scenariosYaml() },
    // ADR
    { path: join(specsDir, 'adr', '0001-initial-project-assumptions.md'), content: templates.initialAdr() },
    // Cases
    { path: join(specsDir, 'cases', 'README.md'), content: templates.casesReadme() },
    // AI
    { path: join(specsDir, 'ai', 'instructions.md'), content: templates.aiInstructions() },
    { path: join(specsDir, 'ai', 'forbidden.md'),    content: templates.aiForbidden() },
    { path: join(specsDir, 'ai', 'checklist.md'),    content: templates.aiChecklist() },
    // .specmanignore
    { path: join(root, '.specmanignore'), content: templates.specmanIgnore() },
  ];

  // Create all files
  let created = 0;
  let skipped  = 0;
  for (const file of files) {
    const written = await safeWriteFile(file.path, file.content);
    if (written) created++; else skipped++;
  }

  // Save config + status
  await saveConfig(root, config);
  await saveStatus(root, { ...status, initialized: true });

  // Generate AI instruction files immediately
  await syncCommand(root, 'all');

  // ── Specs Structure ──
  printSection('Specs Structure Created');
  printTree(`${config.specsDir}/`, [
    '├── 00-project-overview.md',
    '├── 01-detected-stack.md',
    '├── 02-assumptions.md',
    '├── 03-open-questions.md',
    '├── product/',
    '│   └── requirements.md',
    '├── engineering/',
    '│   ├── coding-rules.md',
    '│   └── testing-rules.md',
    '├── architecture/',
    '│   ├── system-overview.md',
    '│   └── components.md',
    '├── domain/',
    '│   ├── business-rules.md',
    '│   ├── workflows.md',
    '│   ├── decision-tables.md',
    '│   └── scenarios.yaml',
    '├── adr/',
    '│   └── 0001-initial-project-assumptions.md',
    '├── cases/',
    '│   └── README.md',
    '└── ai/',
    '    ├── instructions.md',
    '    ├── forbidden.md',
    '    └── checklist.md',
  ]);
  console.log();
  printSummaryBox([
    { icon: icons.success, label: 'Files created', value: created, color: c.greenB },
    { icon: icons.info,    label: 'Files skipped', value: skipped, color: c.dim  },
  ]);

  await maybeGenerateSpecsWithAi(root, options);
}

async function maybeGenerateSpecsWithAi(root: string, options: InitOptions): Promise<void> {
  if (options.noPrompt) {
    printInitNextSteps();
    return;
  }

  const assistant = normalizeAssistant(options.assistant);
  if (options.assistant && !assistant) {
    const suggestion = suggestAssistant(options.assistant);
    if (suggestion) {
      printCallout('warn', [
        `Unknown assistant CLI: "${options.assistant}". Did you mean "${suggestion}"?`,
        `Using "${suggestion}" instead.`,
      ]);
      await runAssistant(root, suggestion, specsPrompt());
      return;
    }
    printCallout('error', [
      `Unknown assistant CLI: "${options.assistant}".`,
      'Supported: claude, codex, cursor.',
    ]);
    process.exit(1);
  }

  if (assistant) {
    await runAssistant(root, assistant, specsPrompt());
    return;
  }

  if (options.prompt) {
    console.log(specsPrompt());
    return;
  }

  if (!isInteractiveTerminal()) {
    printInitNextSteps();
    return;
  }

  const selected = await askSpecGenerationMode();
  if (selected === 'skip') {
    printInitNextSteps();
    return;
  }
  if (selected === 'prompt') {
    console.log(specsPrompt());
    return;
  }
  await runAssistant(root, selected, specsPrompt());
}

async function askSpecGenerationMode(): Promise<AssistantCli | 'prompt' | 'skip'> {
  const choice = await selectMenu('Fill Specs Now?', [
    { key: '1', label: 'Claude CLI',   value: 'claude' as const },
    { key: '2', label: 'Codex CLI',    value: 'codex'  as const },
    { key: '3', label: 'Print prompt', value: 'prompt' as const },
    { key: '4', label: 'Skip',         value: 'skip'   as const },
  ], 'skip');
  return choice as AssistantCli | 'prompt' | 'skip';
}

function printInitNextSteps(): void {
  printSection('Next Steps');
  console.log(`  ${c.bold(c.cyanB('1'))}  Run ${c.cyan('specman init --with claude')} or ${c.cyan('specman init --with codex')} to let AI fill specs`);
  console.log(`  ${c.bold(c.cyanB('2'))}  Run ${c.cyan('specman init --prompt')} to print a prompt for any AI tool`);
  console.log(`  ${c.bold(c.cyanB('3'))}  Run ${c.cyan('specman validate')} after specs are filled`);
  console.log();
}
