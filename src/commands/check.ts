import { join } from 'node:path';
import { loadConfig, loadStatus } from '../core/config.js';
import { fileExists, listFilesRecursive, readTextFile, getFileSize } from '../core/files.js';
import { checkForSecrets } from '../core/redactor.js';
import { icons, withLoader } from '../core/ui.js';
import type { CheckResult } from '../types.js';

/**
 * Validate spec structure and content.
 */
export async function checkCommand(root: string): Promise<void> {
  const config = await loadConfig(root);
  const status = await loadStatus(root);
  const specsDir = join(root, config.specsDir);
  const results: CheckResult[] = [];

  await withLoader('Running specman checks', async () => {
    // ─── Check initialization ───
    if (!status.initialized) {
      results.push({ severity: 'ERROR', message: 'specman has not been initialized. Run `specman init`.' });
      return;
    }

    // ─── Check required structure ───
    const requiredDirs = [
      'product',
      'engineering',
      'architecture',
      'domain',
      'adr',
      'cases',
      'ai',
    ];

    for (const dir of requiredDirs) {
      if (!(await fileExists(join(specsDir, dir)))) {
        results.push({ severity: 'ERROR', message: `Missing required directory: ${config.specsDir}/${dir}/` });
      }
    }

    const requiredFiles = [
      '00-project-overview.md',
      '01-detected-stack.md',
      '02-assumptions.md',
      '03-open-questions.md',
    ];

    for (const file of requiredFiles) {
      if (!(await fileExists(join(specsDir, file)))) {
        results.push({ severity: 'ERROR', message: `Missing required file: ${config.specsDir}/${file}` });
      }
    }

    // ─── Check approval status ───
    if (config.approvedRequired && !status.approved) {
      results.push({ severity: 'ERROR', message: 'Specs are not approved but approvedRequired is true. Run `specman approve`.' });
    }

    // ─── Check for draft assumptions ───
    const assumptions = await readTextFile(join(specsDir, '02-assumptions.md'));
    if (assumptions && assumptions.includes('⚠️ DRAFT')) {
      results.push({ severity: 'WARN', message: 'Assumptions file still contains DRAFT marker.', file: `${config.specsDir}/02-assumptions.md` });
    }

    // ─── Check for empty recommended files ───
    const recommendedFiles = [
      'domain/business-rules.md',
      'architecture/system-overview.md',
      'engineering/coding-rules.md',
    ];

    for (const file of recommendedFiles) {
      const content = await readTextFile(join(specsDir, file));
      if (content) {
        // Check if file only contains template placeholders
        const stripped = content.replace(/<!--[\s\S]*?-->/g, '').replace(/^#+\s.*$/gm, '').replace(/^>.*$/gm, '').trim();
        if (stripped.length < 20) {
          results.push({ severity: 'WARN', message: `File appears to be empty/template-only: ${config.specsDir}/${file}`, file: `${config.specsDir}/${file}` });
        }
      }
    }

    // ─── Check for secrets in specs and cases ───
    const allFiles = await listFilesRecursive(specsDir);
    const textFiles = allFiles.filter(f => f.endsWith('.md') || f.endsWith('.yaml') || f.endsWith('.yml'));

    for (const file of textFiles) {
      const content = await readTextFile(file);
      if (!content) continue;

      const secrets = checkForSecrets(content);
      if (secrets.length > 0) {
        for (const secret of secrets) {
          // Skip email pattern in template files (reduce false positives)
          if (secret.pattern === 'Email Address' && content.includes('⚠️ DRAFT')) continue;

          results.push({
            severity: 'ERROR',
            message: `Potential ${secret.pattern} found at line ${secret.line}: ${secret.match}`,
            file: file.replace(root + '/', ''),
            line: secret.line,
          });
        }
      }
    }

    // ─── Check case file sizes ───
    const casesDir = join(specsDir, 'cases');
    const caseFiles = (await listFilesRecursive(casesDir)).filter(f => f.endsWith('.md') && !f.endsWith('README.md'));

    for (const file of caseFiles) {
      const size = await getFileSize(file);
      if (size > config.caseMaxBytes) {
        results.push({
          severity: 'WARN',
          message: `Case file is too large (${size} bytes > ${config.caseMaxBytes} limit): ${file.replace(root + '/', '')}`,
          file: file.replace(root + '/', ''),
        });
      }
    }

    // ─── Info: counts ───
    const adrFiles = (await listFilesRecursive(join(specsDir, 'adr'))).filter(f => f.endsWith('.md'));
    const domainFiles = (await listFilesRecursive(join(specsDir, 'domain'))).filter(f => f.endsWith('.md') || f.endsWith('.yaml') || f.endsWith('.yml'));

    results.push({ severity: 'INFO', message: `Found ${adrFiles.length} ADR(s)` });
    results.push({ severity: 'INFO', message: `Found ${domainFiles.length} domain file(s)` });
    results.push({ severity: 'INFO', message: `Found ${caseFiles.length} solved case(s)` });
    results.push({ severity: 'INFO', message: `Found ${textFiles.length} total spec file(s)` });
  });

  // ─── Print results ───
  printResults(results);

  // ─── Exit code ───
  const hasErrors = results.some(r => r.severity === 'ERROR');
  if (hasErrors) {
    process.exit(1);
  }
}

function printResults(results: CheckResult[]): void {
  const errors = results.filter(r => r.severity === 'ERROR');
  const warns = results.filter(r => r.severity === 'WARN');
  const infos = results.filter(r => r.severity === 'INFO');

  if (errors.length > 0) {
    console.log(`${icons.error} ERRORS:`);
    for (const r of errors) {
      console.log(`   ERROR: ${r.message}`);
    }
    console.log();
  }

  if (warns.length > 0) {
    console.log(`${icons.warn} WARNINGS:`);
    for (const r of warns) {
      console.log(`   WARN: ${r.message}`);
    }
    console.log();
  }

  if (infos.length > 0) {
    console.log(`${icons.info} INFO:`);
    for (const r of infos) {
      console.log(`   ${r.message}`);
    }
    console.log();
  }

  console.log(`Summary: ${errors.length} error(s), ${warns.length} warning(s), ${infos.length} info(s)`);
}
