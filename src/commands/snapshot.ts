import { join } from 'node:path';
import { writeFile, mkdir } from 'node:fs/promises';
import { createSnapshot } from '../core/hash.js';
import { loadConfig } from '../core/config.js';

/**
 * Create or update the logic-lock snapshot.
 */
export async function snapshotCommand(root: string): Promise<void> {
  const config = await loadConfig(root);

  if (!config.logicLock.enabled) {
    console.log('ℹ️  Logic-lock is disabled in .specman/config.json.');
    console.log('   Set logicLock.enabled to true and configure paths to use this feature.');
    return;
  }

  console.log('📸 Creating logic-lock snapshot...\n');
  console.log(`   Scanning patterns: ${config.logicLock.paths.join(', ')}\n`);

  const snapshot = await createSnapshot(root);

  if (snapshot.items.length === 0) {
    console.log('⚠️  No files matched the configured logic-lock paths.');
    console.log('   Check logicLock.paths in .specman/config.json.');
    return;
  }

  // Save snapshot
  const snapshotDir = join(root, '.specman', 'snapshots');
  await mkdir(snapshotDir, { recursive: true });
  const snapshotPath = join(snapshotDir, 'logic-lock.json');
  await writeFile(snapshotPath, JSON.stringify(snapshot, null, 2) + '\n', 'utf-8');

  console.log(`   Snapshotted ${snapshot.items.length} file(s):`);
  for (const item of snapshot.items) {
    console.log(`   • ${item.path} (${item.hash.substring(0, 12)}...)`);
  }

  console.log(`\n✅ Snapshot saved to ${snapshotPath}`);
  console.log('   Run `specman validate --logic` to check for changes.');
}
