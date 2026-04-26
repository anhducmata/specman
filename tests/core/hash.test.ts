import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { hashFile, hashString, compareSnapshots } from '../../src/core/hash.js';
import type { LogicLockSnapshot } from '../../src/types.js';

describe('hash', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'specman-hash-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('hashFile', () => {
    it('should return consistent hash for same content', async () => {
      const filePath = join(tempDir, 'test.txt');
      await writeFile(filePath, 'hello world');

      const hash1 = await hashFile(filePath);
      const hash2 = await hashFile(filePath);
      expect(hash1).toBe(hash2);
    });

    it('should return different hash for different content', async () => {
      const file1 = join(tempDir, 'test1.txt');
      const file2 = join(tempDir, 'test2.txt');
      await writeFile(file1, 'hello');
      await writeFile(file2, 'world');

      const hash1 = await hashFile(file1);
      const hash2 = await hashFile(file2);
      expect(hash1).not.toBe(hash2);
    });

    it('should return a 64-character hex string (SHA-256)', async () => {
      const filePath = join(tempDir, 'test.txt');
      await writeFile(filePath, 'test content');

      const hash = await hashFile(filePath);
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('hashString', () => {
    it('should return consistent hash for same string', () => {
      expect(hashString('test')).toBe(hashString('test'));
    });

    it('should return different hash for different strings', () => {
      expect(hashString('a')).not.toBe(hashString('b'));
    });
  });

  describe('compareSnapshots', () => {
    it('should detect no changes when snapshots match', () => {
      const snapshot: LogicLockSnapshot = {
        version: 1,
        createdAt: new Date().toISOString(),
        items: [
          { id: 'test', type: 'file', path: 'src/test.ts', hash: 'abc123' },
        ],
      };

      const diff = compareSnapshots(snapshot, snapshot);
      expect(diff.changed).toHaveLength(0);
      expect(diff.added).toHaveLength(0);
      expect(diff.removed).toHaveLength(0);
    });

    it('should detect changed files', () => {
      const saved: LogicLockSnapshot = {
        version: 1,
        createdAt: new Date().toISOString(),
        items: [
          { id: 'test', type: 'file', path: 'src/test.ts', hash: 'abc123' },
        ],
      };

      const current: LogicLockSnapshot = {
        version: 1,
        createdAt: new Date().toISOString(),
        items: [
          { id: 'test', type: 'file', path: 'src/test.ts', hash: 'def456' },
        ],
      };

      const diff = compareSnapshots(saved, current);
      expect(diff.changed).toHaveLength(1);
      expect(diff.changed[0].oldHash).toBe('abc123');
      expect(diff.changed[0].newHash).toBe('def456');
    });

    it('should detect added files', () => {
      const saved: LogicLockSnapshot = {
        version: 1,
        createdAt: new Date().toISOString(),
        items: [],
      };

      const current: LogicLockSnapshot = {
        version: 1,
        createdAt: new Date().toISOString(),
        items: [
          { id: 'new', type: 'file', path: 'src/new.ts', hash: 'abc123' },
        ],
      };

      const diff = compareSnapshots(saved, current);
      expect(diff.added).toHaveLength(1);
    });

    it('should detect removed files', () => {
      const saved: LogicLockSnapshot = {
        version: 1,
        createdAt: new Date().toISOString(),
        items: [
          { id: 'old', type: 'file', path: 'src/old.ts', hash: 'abc123' },
        ],
      };

      const current: LogicLockSnapshot = {
        version: 1,
        createdAt: new Date().toISOString(),
        items: [],
      };

      const diff = compareSnapshots(saved, current);
      expect(diff.removed).toHaveLength(1);
    });
  });
});
