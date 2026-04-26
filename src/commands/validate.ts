import { createSnapshot, loadSnapshot, compareSnapshots } from '../core/hash.js';
import { loadConfig } from '../core/config.js';
import { icons, withLoader } from '../core/ui.js';

/**
 * Validate logic-lock: compare current hashes with saved snapshot.
 */
export async function validateCommand(root: string, logic: boolean): Promise<void> {
  if (!logic) {
    console.log('Usage: specman validate --logic');
    console.log('   Compare current file hashes with saved logic-lock snapshot.');
    return;
  }

  const config = await loadConfig(root);

  if (!config.logicLock.enabled) {
    console.log(`${icons.info} Logic-lock is disabled in .specman/config.json.`);
    return;
  }

  const saved = await loadSnapshot(root);
  if (!saved) {
    console.log(`${icons.error} No logic-lock snapshot found.`);
    console.log('   Run `specman snapshot` to create one first.');
    process.exit(1);
  }

  const result = await withLoader('Validating logic-lock', async () => {
    const current = await createSnapshot(root);
    const diff = compareSnapshots(saved, current);
    return diff;
  });

  const hasChanges = result.changed.length > 0 || result.added.length > 0 || result.removed.length > 0;

  if (!hasChanges) {
    console.log(`${icons.success} No changes detected. Logic-lock is intact.`);
    return;
  }

  // Report changes
  if (result.changed.length > 0) {
    console.log(`${icons.warn} CHANGED files (logic may have changed):`);
    for (const c of result.changed) {
      console.log(`   ${icons.bullet} ${c.item.path}`);
      console.log(`     old: ${c.oldHash.substring(0, 16)}...`);
      console.log(`     new: ${c.newHash.substring(0, 16)}...`);
    }
    console.log();
  }

  if (result.added.length > 0) {
    console.log(`+ NEW files (not in previous snapshot):`);
    for (const a of result.added) {
      console.log(`   ${icons.bullet} ${a.path}`);
    }
    console.log();
  }

  if (result.removed.length > 0) {
    console.log(`- REMOVED files (were in previous snapshot):`);
    for (const r of result.removed) {
      console.log(`   ${icons.bullet} ${r.path}`);
    }
    console.log();
  }

  console.log('Recommendations:');
  console.log('   1. Review the changed files to confirm they are expected');
  console.log('   2. Run domain scenario tests if applicable');
  console.log('   3. Run `specman snapshot` to update the snapshot if changes are approved');
}
