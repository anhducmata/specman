import { existsSync, readdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';

export interface Session {
  id: string;
  date: string;
  slug: string;
  status: string;
  file: string;
}

export interface Decision {
  id: string;
  date: string;
  slug: string;
  status: string;
  file: string;
}

export interface Feedback {
  id: string;
  date: string;
  slug: string;
  outcome: string;
  file: string;
}

export interface KBData {
  kbDir: string;
  projectDir: string;
  sessions: Session[];
  decisions: Decision[];
  feedback: Feedback[];
  activeSession: string | null;
}

function parseFrontmatter(content: string): Record<string, string> {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const result: Record<string, string> = {};
  for (const line of match[1].split('\n')) {
    const m = line.match(/^(\w+):\s*"?([^"]*)"?\s*$/);
    if (m) result[m[1]] = m[2];
  }
  return result;
}

export function findKBDir(): string | null {
  let dir = process.cwd();
  while (dir !== '/') {
    const kb = join(dir, '.specman');
    if (existsSync(kb)) return kb;
    dir = dirname(dir);
  }
  return null;
}

export function readKB(): KBData | null {
  const kbDir = findKBDir();
  if (!kbDir) return null;
  const projectDir = dirname(kbDir);

  const sessions: Session[] = [];
  const sessionsDir = join(kbDir, 'sessions');
  if (existsSync(sessionsDir)) {
    for (const f of readdirSync(sessionsDir).filter((f: string) => f.endsWith('.md')).sort().reverse()) {
      try {
        const content = readFileSync(join(sessionsDir, f), 'utf8');
        const fm = parseFrontmatter(content);
        sessions.push({
          id: fm['id'] ?? f,
          date: fm['date'] ?? '',
          slug: fm['slug'] ?? f,
          status: fm['status'] ?? 'unknown',
          file: join(sessionsDir, f),
        });
      } catch {}
    }
  }

  const decisions: Decision[] = [];
  const decisionsDir = join(kbDir, 'decisions');
  if (existsSync(decisionsDir)) {
    for (const f of readdirSync(decisionsDir).filter((f: string) => f.endsWith('.md')).sort().reverse()) {
      try {
        const content = readFileSync(join(decisionsDir, f), 'utf8');
        const fm = parseFrontmatter(content);
        decisions.push({
          id: fm['id'] ?? f,
          date: fm['date'] ?? '',
          slug: fm['slug'] ?? f,
          status: fm['status'] ?? 'unknown',
          file: join(decisionsDir, f),
        });
      } catch {}
    }
  }

  const feedback: Feedback[] = [];
  const feedbackDir = join(kbDir, 'feedback');
  if (existsSync(feedbackDir)) {
    for (const f of readdirSync(feedbackDir).filter((f: string) => f.endsWith('.md')).sort().reverse()) {
      try {
        const content = readFileSync(join(feedbackDir, f), 'utf8');
        const fm = parseFrontmatter(content);
        feedback.push({
          id: fm['id'] ?? f,
          date: fm['date'] ?? '',
          slug: fm['slug'] ?? f,
          outcome: fm['outcome'] ?? '',
          file: join(feedbackDir, f),
        });
      } catch {}
    }
  }

  const currentSessionFile = join(projectDir, '.claude', 'current-session');
  let activeSession: string | null = null;
  if (existsSync(currentSessionFile)) {
    activeSession = readFileSync(currentSessionFile, 'utf8').trim() || null;
  }

  return { kbDir, projectDir, sessions, decisions, feedback, activeSession };
}

export function getHooksStatus(projectDir: string): Record<string, boolean> {
  const settingsFile = join(projectDir, '.claude', 'settings.json');
  if (!existsSync(settingsFile)) return {};
  const content = readFileSync(settingsFile, 'utf8');
  return {
    stop: content.includes('_stop-hook'),
    'session-start': content.includes('_hook-session-start'),
    'auto-session': content.includes('_hook-auto-session'),
    guard: content.includes('_hook-guard'),
    'auto-stage': content.includes('_hook-auto-stage'),
    'pre-compact': content.includes('_hook-pre-compact'),
  };
}
