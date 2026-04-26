import { readFile, writeFile, mkdir, access, readdir, stat } from 'node:fs/promises';
import { join, dirname } from 'node:path';

/**
 * Ensure a directory exists, creating it recursively if needed.
 */
export async function ensureDir(dirPath: string): Promise<void> {
  await mkdir(dirPath, { recursive: true });
}

/**
 * Check if a file or directory exists.
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Write a file, creating parent directories if needed.
 * Will NOT overwrite unless force is true.
 */
export async function safeWriteFile(
  filePath: string,
  content: string,
  force = false,
): Promise<boolean> {
  if (!force && (await fileExists(filePath))) {
    return false;
  }
  await ensureDir(dirname(filePath));
  await writeFile(filePath, content, 'utf-8');
  return true;
}

/**
 * Read a text file, returning null if it doesn't exist.
 */
export async function readTextFile(filePath: string): Promise<string | null> {
  try {
    return await readFile(filePath, 'utf-8');
  } catch {
    return null;
  }
}

/**
 * Read a file as a buffer, returning null if it doesn't exist.
 */
export async function readFileBuffer(filePath: string): Promise<Buffer | null> {
  try {
    return await readFile(filePath);
  } catch {
    return null;
  }
}

/**
 * Convert a string to a safe kebab-case filename.
 */
export function toKebabCase(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Get file size in bytes. Returns 0 if file doesn't exist.
 */
export async function getFileSize(filePath: string): Promise<number> {
  try {
    const s = await stat(filePath);
    return s.size;
  } catch {
    return 0;
  }
}

/**
 * Recursively list all files in a directory.
 */
export async function listFilesRecursive(dirPath: string): Promise<string[]> {
  const results: string[] = [];

  async function walk(dir: string): Promise<void> {
    try {
      const entries = await readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
          await walk(fullPath);
        } else if (entry.isFile()) {
          results.push(fullPath);
        }
      }
    } catch {
      // Directory doesn't exist or not readable
    }
  }

  await walk(dirPath);
  return results;
}

/**
 * Map items with bounded concurrency.
 */
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  mapper: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) return [];
  const normalizedLimit = Math.max(1, Math.floor(limit));
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (true) {
      const currentIndex = nextIndex;
      nextIndex++;
      if (currentIndex >= items.length) return;
      results[currentIndex] = await mapper(items[currentIndex], currentIndex);
    }
  }

  const workers = Array.from({ length: Math.min(normalizedLimit, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

/**
 * Read .specmanignore patterns (one per line, ignoring comments and blanks).
 */
export async function readIgnorePatterns(root: string): Promise<string[]> {
  const content = await readTextFile(join(root, '.specmanignore'));
  if (!content) return [];
  return content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'));
}
