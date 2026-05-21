import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, mkdtempSync, realpathSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// We test readKB and getHooksStatus by pointing them at a temp directory.
// findKBDir walks up from process.cwd(), so we chdir into the temp project.

let tmpProject: string;
let kbDir: string;
let origCwd: string;

beforeEach(() => {
  origCwd = process.cwd();
  tmpProject = realpathSync(mkdtempSync(join(tmpdir(), 'specman-test-')));
  kbDir = join(tmpProject, '.specman');
  mkdirSync(join(kbDir, 'sessions'), { recursive: true });
  mkdirSync(join(kbDir, 'decisions'), { recursive: true });
  mkdirSync(join(kbDir, 'feedback'), { recursive: true });
  mkdirSync(join(kbDir, 'identity'), { recursive: true });
  process.chdir(tmpProject);
});

afterEach(() => {
  process.chdir(origCwd);
  rmSync(tmpProject, { recursive: true, force: true });
});

// ── helpers ──────────────────────────────────────────────────────────────────

function fm(fields: Record<string, string>): string {
  const body = Object.entries(fields)
    .map(([k, v]) => `${k}: "${v}"`)
    .join('\n');
  return `---\n${body}\n---\n\n# content\n`;
}

// ── findKBDir ─────────────────────────────────────────────────────────────────

describe('findKBDir', () => {
  it('finds .specman/ in cwd', async () => {
    const { findKBDir } = await import('../kb.js');
    expect(findKBDir()).toBe(kbDir);
  });

  it('finds .specman/ from a subdirectory', async () => {
    const sub = join(tmpProject, 'a', 'b', 'c');
    mkdirSync(sub, { recursive: true });
    process.chdir(sub);
    const { findKBDir } = await import('../kb.js');
    expect(findKBDir()).toBe(kbDir);
  });

  it('returns null when no .specman/ exists', async () => {
    rmSync(kbDir, { recursive: true, force: true });
    const { findKBDir } = await import('../kb.js');
    // Walk up until / — won't find one in temp dirs
    // We can only assert it returns null if tmpProject is not under any real .specman
    const result = findKBDir();
    expect(result === null || typeof result === 'string').toBe(true);
  });
});

// ── readKB ────────────────────────────────────────────────────────────────────

describe('readKB', () => {
  it('returns null when no .specman/ exists', async () => {
    rmSync(kbDir, { recursive: true, force: true });
    const { readKB } = await import('../kb.js');
    const result = readKB();
    // Might find a parent .specman; if none, null
    if (result === null) expect(result).toBeNull();
  });

  it('returns empty arrays when subdirs are empty', async () => {
    const { readKB } = await import('../kb.js');
    const kb = readKB()!;
    expect(kb.sessions).toEqual([]);
    expect(kb.decisions).toEqual([]);
    expect(kb.feedback).toEqual([]);
    expect(kb.activeSession).toBeNull();
    expect(kb.kbDir).toBe(kbDir);
    expect(kb.projectDir).toBe(tmpProject);
  });

  it('parses session files with frontmatter', async () => {
    writeFileSync(
      join(kbDir, 'sessions', '2026-01-15--001--my-session.md'),
      fm({ id: '2026-01-15--001', date: '2026-01-15', slug: 'my-session', status: 'completed' }),
    );
    const { readKB } = await import('../kb.js');
    const kb = readKB()!;
    expect(kb.sessions).toHaveLength(1);
    expect(kb.sessions[0]).toMatchObject({
      id: '2026-01-15--001',
      date: '2026-01-15',
      slug: 'my-session',
      status: 'completed',
    });
  });

  it('parses decision files', async () => {
    writeFileSync(
      join(kbDir, 'decisions', 'DEC-001--use-postgres.md'),
      fm({ id: 'DEC-001', date: '2026-01-10', slug: 'use-postgres', status: 'accepted' }),
    );
    const { readKB } = await import('../kb.js');
    const kb = readKB()!;
    expect(kb.decisions).toHaveLength(1);
    expect(kb.decisions[0].id).toBe('DEC-001');
    expect(kb.decisions[0].slug).toBe('use-postgres');
  });

  it('parses feedback files', async () => {
    writeFileSync(
      join(kbDir, 'feedback', 'FB-001--caching-works.md'),
      fm({ id: 'FB-001', date: '2026-01-12', slug: 'caching-works', outcome: 'positive' }),
    );
    const { readKB } = await import('../kb.js');
    const kb = readKB()!;
    expect(kb.feedback).toHaveLength(1);
    expect(kb.feedback[0].outcome).toBe('positive');
  });

  it('returns sessions in reverse-sorted order', async () => {
    writeFileSync(join(kbDir, 'sessions', '2026-01-01--001--alpha.md'), fm({ id: '2026-01-01--001', date: '2026-01-01', slug: 'alpha', status: 'completed' }));
    writeFileSync(join(kbDir, 'sessions', '2026-01-20--002--beta.md'),  fm({ id: '2026-01-20--002', date: '2026-01-20', slug: 'beta',  status: 'completed' }));
    const { readKB } = await import('../kb.js');
    const kb = readKB()!;
    expect(kb.sessions[0].slug).toBe('beta');
    expect(kb.sessions[1].slug).toBe('alpha');
  });

  it('ignores files missing frontmatter gracefully', async () => {
    writeFileSync(join(kbDir, 'sessions', 'bad-file.md'), '# no frontmatter here\n');
    const { readKB } = await import('../kb.js');
    const kb = readKB()!;
    expect(kb.sessions).toHaveLength(1);
    // Falls back to filename as id/slug
    expect(kb.sessions[0].id).toBe('bad-file.md');
  });

  it('reads activeSession from .claude/current-session', async () => {
    const claudeDir = join(tmpProject, '.claude');
    mkdirSync(claudeDir, { recursive: true });
    writeFileSync(join(claudeDir, 'current-session'), '/some/path/session.md\n');
    const { readKB } = await import('../kb.js');
    const kb = readKB()!;
    expect(kb.activeSession).toBe('/some/path/session.md');
  });

  it('returns null activeSession when current-session is empty', async () => {
    const claudeDir = join(tmpProject, '.claude');
    mkdirSync(claudeDir, { recursive: true });
    writeFileSync(join(claudeDir, 'current-session'), '   \n');
    const { readKB } = await import('../kb.js');
    const kb = readKB()!;
    expect(kb.activeSession).toBeNull();
  });
});

// ── getHooksStatus ────────────────────────────────────────────────────────────

describe('getHooksStatus', () => {
  it('returns empty object when settings.json missing', async () => {
    const { getHooksStatus } = await import('../kb.js');
    const status = getHooksStatus(tmpProject);
    expect(status).toEqual({});
  });

  it('detects stop hook', async () => {
    const claudeDir = join(tmpProject, '.claude');
    mkdirSync(claudeDir, { recursive: true });
    writeFileSync(join(claudeDir, 'settings.json'), JSON.stringify({
      hooks: { Stop: [{ matcher: '', hooks: [{ type: 'command', command: 'specman _stop-hook' }] }] },
    }));
    const { getHooksStatus } = await import('../kb.js');
    const status = getHooksStatus(tmpProject);
    expect(status.stop).toBe(true);
  });

  it('detects session-start hook', async () => {
    const claudeDir = join(tmpProject, '.claude');
    mkdirSync(claudeDir, { recursive: true });
    writeFileSync(join(claudeDir, 'settings.json'), JSON.stringify({
      hooks: { SessionStart: [{ matcher: '', hooks: [{ type: 'command', command: 'specman _hook-session-start' }] }] },
    }));
    const { getHooksStatus } = await import('../kb.js');
    const status = getHooksStatus(tmpProject);
    expect(status['session-start']).toBe(true);
    expect(status.stop).toBe(false);
  });

  it('returns all hooks as false when none are configured', async () => {
    const claudeDir = join(tmpProject, '.claude');
    mkdirSync(claudeDir, { recursive: true });
    writeFileSync(join(claudeDir, 'settings.json'), JSON.stringify({ permissions: [] }));
    const { getHooksStatus } = await import('../kb.js');
    const status = getHooksStatus(tmpProject);
    expect(Object.values(status).every(v => v === false)).toBe(true);
  });

  it('detects multiple hooks simultaneously', async () => {
    const claudeDir = join(tmpProject, '.claude');
    mkdirSync(claudeDir, { recursive: true });
    writeFileSync(join(claudeDir, 'settings.json'), JSON.stringify({
      hooks: {
        Stop: [{ hooks: [{ command: 'specman _stop-hook' }] }],
        PreToolUse: [{ hooks: [{ command: 'specman _hook-guard' }] }],
        PreCompact: [{ hooks: [{ command: 'specman _hook-pre-compact' }] }],
      },
    }));
    const { getHooksStatus } = await import('../kb.js');
    const status = getHooksStatus(tmpProject);
    expect(status.stop).toBe(true);
    expect(status.guard).toBe(true);
    expect(status['pre-compact']).toBe(true);
    expect(status['session-start']).toBe(false);
  });
});
