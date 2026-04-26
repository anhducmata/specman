import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { join } from 'node:path';
import { scanProject } from '../core/scanner.js';
import { loadConfig, loadStatus, saveConfig, saveStatus, ensureSpecmanDir } from '../core/config.js';
import { safeWriteFile } from '../core/files.js';
import * as templates from '../core/templates.js';
import { withLoader, icons, isInteractiveTerminal } from '../core/ui.js';
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
  const config = await loadConfig(root);
  const status = await loadStatus(root);
  const scan = await withLoader('Scanning project', () => scanProject(root));
  const specsDir = join(root, config.specsDir);

  // Report detected stack
  if (scan.detectedStack.length > 0) {
    console.log('Detected stack:');
    for (const tech of scan.detectedStack) {
      console.log(`   ${icons.bullet} ${tech.name} (from ${tech.source})`);
    }
    console.log();
  } else {
    console.log(`${icons.warn} No technologies detected. You can add them manually later.\n`);
  }

  // Create .specman directory
  await ensureSpecmanDir(root);

  // Define all files to create
  const files: { path: string; content: string }[] = [
    // Root specs
    { path: join(specsDir, '00-project-overview.md'), content: templates.projectOverview(scan) },
    { path: join(specsDir, '01-detected-stack.md'), content: templates.detectedStack(scan) },
    { path: join(specsDir, '02-assumptions.md'), content: templates.assumptions(scan) },
    { path: join(specsDir, '03-open-questions.md'), content: templates.openQuestions() },

    // Product
    { path: join(specsDir, 'product', 'requirements.md'), content: templates.productRequirements() },

    // Engineering
    { path: join(specsDir, 'engineering', 'coding-rules.md'), content: templates.codingRules() },
    { path: join(specsDir, 'engineering', 'testing-rules.md'), content: templates.testingRules() },

    // Architecture
    { path: join(specsDir, 'architecture', 'system-overview.md'), content: templates.systemOverview() },
    { path: join(specsDir, 'architecture', 'components.md'), content: templates.components() },

    // Domain
    { path: join(specsDir, 'domain', 'business-rules.md'), content: templates.businessRules() },
    { path: join(specsDir, 'domain', 'workflows.md'), content: templates.workflows() },
    { path: join(specsDir, 'domain', 'decision-tables.md'), content: templates.decisionTables() },
    { path: join(specsDir, 'domain', 'scenarios.yaml'), content: templates.scenariosYaml() },

    // ADR
    { path: join(specsDir, 'adr', '0001-initial-project-assumptions.md'), content: templates.initialAdr() },

    // Cases
    { path: join(specsDir, 'cases', 'README.md'), content: templates.casesReadme() },

    // AI
    { path: join(specsDir, 'ai', 'instructions.md'), content: templates.aiInstructions() },
    { path: join(specsDir, 'ai', 'forbidden.md'), content: templates.aiForbidden() },
    { path: join(specsDir, 'ai', 'checklist.md'), content: templates.aiChecklist() },

    // .specmanignore
    { path: join(root, '.specmanignore'), content: templates.specmanIgnore() },
  ];

  // Create all files
  let created = 0;
  let skipped = 0;

  for (const file of files) {
    const written = await safeWriteFile(file.path, file.content);
    if (written) {
      created++;
    } else {
      skipped++;
    }
  }

  // Save config
  await saveConfig(root, config);

  // Save status
  await saveStatus(root, { ...status, initialized: true });

  // Generate AI instruction files immediately so agents know how to use specman.
  await syncCommand(root, 'all');

  // Print summary
  console.log('📁 Specs structure created:\n');
  console.log(`   ${config.specsDir}/`);
  console.log('   ├── 00-project-overview.md');
  console.log('   ├── 01-detected-stack.md');
  console.log('   ├── 02-assumptions.md');
  console.log('   ├── 03-open-questions.md');
  console.log('   ├── product/');
  console.log('   │   └── requirements.md');
  console.log('   ├── engineering/');
  console.log('   │   ├── coding-rules.md');
  console.log('   │   └── testing-rules.md');
  console.log('   ├── architecture/');
  console.log('   │   ├── system-overview.md');
  console.log('   │   └── components.md');
  console.log('   ├── domain/');
  console.log('   │   ├── business-rules.md');
  console.log('   │   ├── workflows.md');
  console.log('   │   ├── decision-tables.md');
  console.log('   │   └── scenarios.yaml');
  console.log('   ├── adr/');
  console.log('   │   └── 0001-initial-project-assumptions.md');
  console.log('   ├── cases/');
  console.log('   │   └── README.md');
  console.log('   └── ai/');
  console.log('       ├── instructions.md');
  console.log('       ├── forbidden.md');
  console.log('       └── checklist.md');
  console.log();
  console.log(`   ${icons.success} ${created} files created, ${skipped} files skipped (already exist)`);
  console.log();

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
      console.log(`${icons.warn} Unknown assistant CLI: "${options.assistant}". Did you mean "${suggestion}"? Using "${suggestion}" instead.`);
      await runAssistant(root, suggestion, specsPrompt());
      return;
    }

    console.log(`${icons.error} Unknown assistant CLI: "${options.assistant}". Supported: claude, codex, cursor.`);
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
  const rl = createInterface({ input: stdin, output: stdout });
  try {
    console.log('Fill specs now?');
    console.log('  1. Claude CLI');
    console.log('  2. Codex CLI');
  console.log('  3. Print prompt');
  console.log('  4. Skip');
  const answer = (await rl.question('Select 1-4: ')).trim().toLowerCase();
  return ({ '1': 'claude', '2': 'codex', '3': 'prompt', '4': 'skip' } as Record<string, AssistantCli | 'prompt' | 'skip'>)[answer]
      ?? normalizeAssistant(answer)
      ?? suggestAssistant(answer)
      ?? (answer === 'prompt' ? 'prompt' : 'skip');
  } finally {
    rl.close();
  }
}

function printInitNextSteps(): void {
  console.log('Next steps:');
  console.log('   1. Run `specman init --with claude` or `specman init --with codex` to let a local AI CLI fill specs');
  console.log('   2. Or run `specman init --prompt` to print a prompt for any AI tool');
  console.log('   3. Run `specman validate` after specs are filled');
}
