import { join } from 'node:path';
import { writeFile, mkdir } from 'node:fs/promises';
import { createSnapshot } from '../core/hash.js';
import { loadConfig } from '../core/config.js';
import { icons, withLoader, c, printCallout, printTree, printSection } from '../core/ui.js';

/**
 * Create or update the logic-lock snapshot.
 */
export async function snapshotCommand(root: string): Promise<void> {
  const config = await loadConfig(root);

  if (!config.logicLock.enabled) {
    printCallout('info', [
      'Logic-lock is disabled in .specman/config.json.',
      `Set ${c.dim('logicLock.enabled = true')} and configure paths to use this feature.`,
    ]);
    return;
  }

  const snapshot = await withLoader('Creating logic-lock snapshot', async () => {
    return await createSnapshot(root);
  });

  if (snapshot.items.length === 0) {
    printCallout('warn', [
      'No files matched the configured logic-lock paths.',
      `Check ${c.dim('logicLock.paths')} in .specman/config.json.`,
    ]);
    return;
  }

  // Save snapshot
  const snapshotDir = join(root, '.specman', 'snapshots');
  await mkdir(snapshotDir, { recursive: true });
  const snapshotPath = join(snapshotDir, 'logic-lock.json');
  await writeFile(snapshotPath, JSON.stringify(snapshot, null, 2) + '\n', 'utf-8');

  printSection(`Snapshotted ${snapshot.items.length} file(s)`);
  printTree('Logic Lock', snapshot.items.map(item => `${item.path} ${c.dim(`(${item.hash.substring(0, 12)}...)`)}`));

  console.log();
  console.log(`  ${icons.success}  ${c.greenB(`Snapshot saved to ${snapshotPath}`)}`);
  console.log(`  Run ${c.cyan('specman validate --logic')} to check for changes.`);
  console.log();
}
