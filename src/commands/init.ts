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
  printCallout,
  selectMenu,
  multiSelectTree,
  type TreeSelectNode,
  c,
} from '../core/ui.js';
import { syncCommand } from './sync.js';
import { normalizeAssistant, runAssistant, specsPrompt, suggestAssistant, detectAvailableAssistants, assistantLabel, type AssistantCli } from '../core/ai.js';

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

  // ── Ask for AI Tool ──
  let selectedAiTool: AssistantCli | 'skip' | 'prompt' = 'skip';
  let shouldRunAi = false;

  if (!options.noPrompt) {
    const assistant = normalizeAssistant(options.assistant);
    if (options.assistant && !assistant) {
      const suggestion = suggestAssistant(options.assistant);
      if (suggestion) {
        printCallout('warn', [
          `Unknown assistant CLI: "${options.assistant}". Did you mean "${suggestion}"?`,
          `Using "${suggestion}" instead.`,
        ]);
        selectedAiTool = suggestion;
        shouldRunAi = true;
      } else {
        printCallout('error', [
          `Unknown assistant CLI: "${options.assistant}".`,
          'Supported: claude, codex, cursor.',
        ]);
        process.exit(1);
      }
    } else if (assistant) {
      selectedAiTool = assistant;
      shouldRunAi = true;
    } else if (options.prompt) {
      selectedAiTool = 'prompt';
    } else if (isInteractiveTerminal()) {
      const available = await detectAvailableAssistants();
      selectedAiTool = await askSpecGenerationMode(available);
      if (selectedAiTool !== 'skip') {
        shouldRunAi = true;
      }
    }
  }

  // ── Create Files ──
  await ensureSpecmanDir(root);

  // Define all files to create in a tree structure
  const specNodes: TreeSelectNode<{ path: string; content: string }>[] = [
    { label: '00-project-overview.md', value: { path: join(specsDir, '00-project-overview.md'), content: templates.projectOverview(scan) }, checked: true },
    { label: '01-detected-stack.md', value: { path: join(specsDir, '01-detected-stack.md'), content: templates.detectedStack(scan) }, checked: true },
    { label: '02-assumptions.md', value: { path: join(specsDir, '02-assumptions.md'), content: templates.assumptions(scan) }, checked: true },
    { label: '03-open-questions.md', value: { path: join(specsDir, '03-open-questions.md'), content: templates.openQuestions() }, checked: true },
    {
      label: 'product/', checked: true, children: [
        { label: 'requirements.md', value: { path: join(specsDir, 'product', 'requirements.md'), content: templates.productRequirements() }, checked: true },
      ]
    },
    {
      label: 'engineering/', checked: true, children: [
        { label: 'coding-rules.md', value: { path: join(specsDir, 'engineering', 'coding-rules.md'), content: templates.codingRules(scan) }, checked: true },
        { label: 'testing-rules.md', value: { path: join(specsDir, 'engineering', 'testing-rules.md'), content: templates.testingRules(scan) }, checked: true },
      ]
    },
    {
      label: 'architecture/', checked: true, children: [
        { label: 'system-overview.md', value: { path: join(specsDir, 'architecture', 'system-overview.md'), content: templates.systemOverview() }, checked: true },
        { label: 'components.md', value: { path: join(specsDir, 'architecture', 'components.md'), content: templates.components() }, checked: true },
      ]
    },
    {
      label: 'domain/', checked: true, children: [
        { label: 'business-rules.md', value: { path: join(specsDir, 'domain', 'business-rules.md'), content: templates.businessRules() }, checked: true },
        { label: 'workflows.md', value: { path: join(specsDir, 'domain', 'workflows.md'), content: templates.workflows() }, checked: true },
        { label: 'decision-tables.md', value: { path: join(specsDir, 'domain', 'decision-tables.md'), content: templates.decisionTables() }, checked: true },
        { label: 'scenarios.yaml', value: { path: join(specsDir, 'domain', 'scenarios.yaml'), content: templates.scenariosYaml() }, checked: true },
      ]
    },
    {
      label: 'adr/', checked: true, children: [
        { label: '0001-initial-project-assumptions.md', value: { path: join(specsDir, 'adr', '0001-initial-project-assumptions.md'), content: templates.initialAdr() }, checked: true },
      ]
    },
    {
      label: 'cases/', checked: true, children: [
        { label: 'README.md', value: { path: join(specsDir, 'cases', 'README.md'), content: templates.casesReadme() }, checked: true },
      ]
    },
    {
      label: 'ai/', checked: true, children: [
        { label: 'instructions.md', value: { path: join(specsDir, 'ai', 'instructions.md'), content: templates.aiInstructions() }, checked: true },
        { label: 'forbidden.md', value: { path: join(specsDir, 'ai', 'forbidden.md'), content: templates.aiForbidden() }, checked: true },
        { label: 'checklist.md', value: { path: join(specsDir, 'ai', 'checklist.md'), content: templates.aiChecklist() }, checked: true },
      ]
    }
  ];

  let filesToCreate = await multiSelectTree(
    'Specs Structure',
    `${config.specsDir}/`,
    specNodes
  );

  if (filesToCreate.length === 0) {
    console.log(`\n  ${icons.info}  No files selected. Initialization cancelled.`);
    process.exit(0);
  }

  // Always create .specmanignore implicitly
  filesToCreate.push({ path: join(root, '.specmanignore'), content: templates.specmanIgnore() });

  // Create selected files
  let created = 0;
  let skipped  = 0;
  for (const file of filesToCreate) {
    const written = await safeWriteFile(file.path, file.content);
    if (written) created++; else skipped++;
  }

  // Save config + status
  await saveConfig(root, config);
  await saveStatus(root, { ...status, initialized: true });

  console.log();
  const skippedMsg = skipped > 0 ? c.dim(` (${skipped} skipped)`) : '';
  console.log(`  ${icons.success}  ${c.greenB(`Initialized ${created} spec file(s)${skippedMsg}`)}`);

  // Generate AI instruction files immediately
  await syncCommand(root, 'all');

  if (selectedAiTool === 'prompt') {
    console.log(specsPrompt());
  } else if (shouldRunAi && selectedAiTool !== 'skip') {
    await runAssistant(root, selectedAiTool, specsPrompt());
  } else {
    printInitNextSteps();
  }
}

async function askSpecGenerationMode(available: AssistantCli[]): Promise<AssistantCli | 'skip'> {
  const choices: { key: string; label: string; value: AssistantCli | 'skip' }[] = [];
  let keyIndex = 1;

  for (const cli of available) {
    choices.push({ key: String(keyIndex++), label: assistantLabel(cli), value: cli });
  }

  choices.push({ key: String(keyIndex++), label: 'Just the default structure', value: 'skip' });

  const choice = await selectMenu('Which tool to update the specs?', choices, 'skip');
  return choice;
}

function printInitNextSteps(): void {
  printSection('Next Steps');
  console.log(`  ${c.bold(c.cyanB('1'))}  Run ${c.cyan('specman init --with <tool>')} to let AI fill specs ${c.dim('(claude, codex, gemini, aider, q)')}`);
  console.log(`  ${c.bold(c.cyanB('2'))}  Run ${c.cyan('specman validate')} after specs are filled`);
  console.log();
}
