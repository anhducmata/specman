import { stdout } from 'node:process';

/**
 * Simple delay for animations.
 */
export const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function isInteractiveTerminal(): boolean {
  return Boolean(stdout.isTTY) && process.env.CI !== 'true';
}

export function supportsColorOutput(): boolean {
  if (!isInteractiveTerminal()) return false;
  if (process.env.NO_COLOR !== undefined) return false;
  return true;
}

export function colorize(text: string, ansiCode: string, enabled = supportsColorOutput()): string {
  if (!enabled) return text;
  return `\x1b[${ansiCode}m${text}\x1b[0m`;
}

/**
 * A simple "Claude-style" dot-animation for long tasks.
 */
export async function withLoader<T>(label: string, task: () => Promise<T>): Promise<T> {
  if (!isInteractiveTerminal()) {
    return task();
  }

  const frames = ['.  ', '.- ', '.-+', '.-+*', '.-+', '.- ', '.  '];
  let i = 0;
  
  const interval = setInterval(() => {
    stdout.write(`\r${label} ${frames[i % frames.length]}   `);
    i++;
  }, 200);

  try {
    const result = await task();
    clearInterval(interval);
    stdout.write(`\r${label} done.         \n\n`);
    return result;
  } catch (error) {
    clearInterval(interval);
    stdout.write(`\r${label} failed.       \n\n`);
    throw error;
  }
}

/**
 * Print a "modern" header.
 */
export function printHeader(title: string) {
  console.log(`\n--- ${title.toUpperCase()} ---`);
}

/**
 * Clean icons.
 */
export const icons = {
  success: '✅',
  error: '❌',
  warn: '⚠️',
  info: 'ℹ️',
  bullet: '•',
};
