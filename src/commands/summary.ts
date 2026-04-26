import { join } from 'node:path';
import { readTextFile, listFilesRecursive } from '../core/files.js';
import { loadConfig, loadStatus } from '../core/config.js';

/**
 * Generate a short project context summary for AI.
 */
export async function summaryCommand(root: string): Promise<void> {
  const config = await loadConfig(root);
  const status = await loadStatus(root);

  if (!status.initialized) {
    console.log('❌ specman has not been initialized. Run `specman init` first.');
    process.exit(1);
  }

  const specsDir = join(root, config.specsDir);

  console.log('━'.repeat(60));
  console.log('📋 PROJECT SUMMARY');
  console.log('━'.repeat(60));
  console.log();

  // Project overview
  const overview = await readTextFile(join(specsDir, '00-project-overview.md'));
  if (overview) {
    const nameMatch = overview.match(/## Name\n(.+)/);
    const descMatch = overview.match(/## Description\n(.+)/);
    if (nameMatch) console.log(`📌 Project: ${nameMatch[1].trim()}`);
    if (descMatch) console.log(`📝 Description: ${descMatch[1].trim()}`);
  }

  // Approval status
  if (status.approved) {
    console.log(`✅ Status: Approved (${status.approvedAt} by ${status.approvedBy})`);
  } else {
    console.log('⚠️  Status: Draft (not yet approved)');
  }
  console.log();

  // Stack
  const stack = await readTextFile(join(specsDir, '01-detected-stack.md'));
  if (stack) {
    const techSection = stack.match(/## Technologies\n([\s\S]*?)(?=\n## |$)/);
    if (techSection) {
      console.log('📦 Stack:');
      const techs = techSection[1].trim().split('\n').filter(l => l.startsWith('- '));
      for (const t of techs) {
        console.log(`   ${t}`);
      }
      console.log();
    }
  }

  // Count ADRs
  const adrDir = join(specsDir, 'adr');
  const adrFiles = (await listFilesRecursive(adrDir)).filter(f => f.endsWith('.md') && !f.endsWith('README.md'));
  console.log(`📐 ADRs: ${adrFiles.length}`);

  // Count domain rules
  const domainDir = join(specsDir, 'domain');
  const domainFiles = (await listFilesRecursive(domainDir)).filter(f => f.endsWith('.md'));
  console.log(`📏 Domain files: ${domainFiles.length}`);

  // Count cases
  const casesDir = join(specsDir, 'cases');
  const caseFiles = (await listFilesRecursive(casesDir)).filter(f => f.endsWith('.md') && !f.endsWith('README.md'));
  console.log(`📦 Solved cases: ${caseFiles.length}`);

  // Domain rules summary
  const businessRules = await readTextFile(join(specsDir, 'domain', 'business-rules.md'));
  if (businessRules) {
    const coreRules = businessRules.match(/## Core Rules\n([\s\S]*?)(?=\n## |$)/);
    if (coreRules && !coreRules[1].includes('<!-- ')) {
      console.log('\n📏 Core Business Rules:');
      console.log(coreRules[1].trim());
    }
  }

  console.log();
  console.log('━'.repeat(60));
}
