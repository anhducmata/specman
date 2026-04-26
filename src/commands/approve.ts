import { userInfo } from 'node:os';
import { loadStatus, saveStatus } from '../core/config.js';
import { icons } from '../core/ui.js';

/**
 * Approve specs — mark them as approved source of truth.
 */
export async function approveCommand(root: string): Promise<void> {
  const status = await loadStatus(root);

  if (!status.initialized) {
    console.log(`${icons.error} specman has not been initialized. Run \`specman init\` first.`);
    process.exit(1);
  }

  if (status.approved) {
    console.log(`${icons.info} Specs are already approved (at ${status.approvedAt} by ${status.approvedBy}).`);
    console.log('   To re-approve, edit .specman/status.json manually or re-run init.');
    return;
  }

  let username = 'unknown';
  try {
    username = userInfo().username || 'unknown';
  } catch {
    // Could not determine user
  }

  const now = new Date().toISOString();

  await saveStatus(root, {
    ...status,
    approved: true,
    approvedAt: now,
    approvedBy: username,
  });

  console.log(`${icons.success} Specs approved!`);
  console.log(`   Approved at: ${now}`);
  console.log(`   Approved by: ${username}`);
  console.log();
  console.log('Next steps:');
  console.log('   Run `specman sync` to update AI instruction files.');
}
