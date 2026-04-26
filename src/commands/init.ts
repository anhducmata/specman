import { join } from 'node:path';
import { scanProject } from '../core/scanner.js';
import { saveConfig, saveStatus, ensureSpecmanDir } from '../core/config.js';
import { safeWriteFile } from '../core/files.js';
import * as templates from '../core/templates.js';
import { DEFAULT_CONFIG, DEFAULT_STATUS } from '../types.js';
import { withLoader, icons } from '../core/ui.js';

/**
 * Initialize specman in the current project.
 * Scans the project, creates specs structure, generates draft assumptions.
 */
export async function initCommand(root: string): Promise<void> {
  const scan = await withLoader('Scanning project', () => scanProject(root));
  const specsDir = join(root, 'specs');

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
  await saveConfig(root, { ...DEFAULT_CONFIG });

  // Save status
  await saveStatus(root, { ...DEFAULT_STATUS, initialized: true });

  // Print summary
  console.log('📁 Specs structure created:\n');
  console.log('   specs/');
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
  console.log('Next steps:');
  console.log('   1. Run `specman review` to see generated assumptions');
  console.log('   2. Edit specs manually to add your project context');
  console.log('   3. Run `specman approve` when specs are ready');
  console.log('   4. Run `specman sync all` to generate AI instruction files');
}
