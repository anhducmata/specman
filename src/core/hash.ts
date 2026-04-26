import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join, basename } from 'node:path';
import { glob } from 'glob';
import type { LogicLockSnapshot, LogicLockItem } from '../types.js';
import { mapWithConcurrency, readTextFile } from './files.js';
import { loadConfig } from './config.js';

/**
 * Compute SHA-256 hash of a file's contents.
 */
export async function hashFile(filePath: string): Promise<string> {
  const content = await readFile(filePath);
  return createHash('sha256').update(content).digest('hex');
}

/**
 * Compute SHA-256 hash of a string.
 */
export function hashString(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

/**
 * Discover files matching logic-lock glob patterns.
 */
export async function discoverLogicLockFiles(root: string): Promise<string[]> {
  const config = await loadConfig(root);

  if (!config.logicLock.enabled || config.logicLock.paths.length === 0) {
    return [];
  }

  const allFiles: string[] = [];
  for (const pattern of config.logicLock.paths) {
    const matches = await glob(pattern, {
      cwd: root,
      nodir: true,
      ignore: ['node_modules/**', 'dist/**', '.specman/**'],
    });
    allFiles.push(...matches);
  }

  // Deduplicate and sort
  return [...new Set(allFiles)].sort();
}

/**
 * Create a logic-lock snapshot from the current file state.
 */
export async function createSnapshot(root: string): Promise<LogicLockSnapshot> {
  const files = await discoverLogicLockFiles(root);
  const items = (await mapWithConcurrency(files, 8, async (file): Promise<LogicLockItem | null> => {
    const fullPath = join(root, file);
    try {
      const hash = await hashFile(fullPath);
      // Generate an ID from the filename (without extension)
      const id = basename(file).replace(/\.[^.]+$/, '');
      return {
        id,
        type: 'file',
        path: file,
        hash,
      };
    } catch {
      // File can't be read, skip
      return null;
    }
  })).filter((item): item is LogicLockItem => item !== null);

  return {
    version: 1,
    createdAt: new Date().toISOString(),
    items,
  };
}

/**
 * Load a saved logic-lock snapshot.
 */
export async function loadSnapshot(root: string): Promise<LogicLockSnapshot | null> {
  const snapshotPath = join(root, '.specman', 'snapshots', 'logic-lock.json');
  const content = await readTextFile(snapshotPath);
  if (!content) return null;
  try {
    return JSON.parse(content) as LogicLockSnapshot;
  } catch {
    return null;
  }
}

/**
 * Compare two snapshots and return differences.
 */
export interface SnapshotDiff {
  changed: { item: LogicLockItem; oldHash: string; newHash: string }[];
  added: LogicLockItem[];
  removed: LogicLockItem[];
}

export function compareSnapshots(
  saved: LogicLockSnapshot,
  current: LogicLockSnapshot,
): SnapshotDiff {
  const savedMap = new Map(saved.items.map(item => [item.path, item]));
  const currentMap = new Map(current.items.map(item => [item.path, item]));

  const changed: SnapshotDiff['changed'] = [];
  const added: LogicLockItem[] = [];
  const removed: LogicLockItem[] = [];

  // Find changed and added
  for (const [path, currentItem] of currentMap) {
    const savedItem = savedMap.get(path);
    if (!savedItem) {
      added.push(currentItem);
    } else if (savedItem.hash !== currentItem.hash) {
      changed.push({ item: currentItem, oldHash: savedItem.hash, newHash: currentItem.hash });
    }
  }

  // Find removed
  for (const [path, savedItem] of savedMap) {
    if (!currentMap.has(path)) {
      removed.push(savedItem);
    }
  }

  return { changed, added, removed };
}
