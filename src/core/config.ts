import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { SpecmanConfig, SpecmanStatus } from '../types.js';
import { DEFAULT_CONFIG, DEFAULT_STATUS } from '../types.js';

const SPECMAN_DIR = '.specman';
const CONFIG_FILE = 'config.json';
const STATUS_FILE = 'status.json';

export function getSpecmanDir(root: string): string {
  return join(root, SPECMAN_DIR);
}

export function getConfigPath(root: string): string {
  return join(root, SPECMAN_DIR, CONFIG_FILE);
}

export function getStatusPath(root: string): string {
  return join(root, SPECMAN_DIR, STATUS_FILE);
}

export async function loadConfig(root: string): Promise<SpecmanConfig> {
  try {
    const raw = await readFile(getConfigPath(root), 'utf-8');
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export async function saveConfig(root: string, config: SpecmanConfig): Promise<void> {
  const dir = getSpecmanDir(root);
  await mkdir(dir, { recursive: true });
  await writeFile(getConfigPath(root), JSON.stringify(config, null, 2) + '\n', 'utf-8');
}

export async function loadStatus(root: string): Promise<SpecmanStatus> {
  try {
    const raw = await readFile(getStatusPath(root), 'utf-8');
    return { ...DEFAULT_STATUS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_STATUS };
  }
}

export async function saveStatus(root: string, status: SpecmanStatus): Promise<void> {
  const dir = getSpecmanDir(root);
  await mkdir(dir, { recursive: true });
  await writeFile(getStatusPath(root), JSON.stringify(status, null, 2) + '\n', 'utf-8');
}

export async function ensureSpecmanDir(root: string): Promise<void> {
  await mkdir(join(root, SPECMAN_DIR, 'snapshots'), { recursive: true });
}
