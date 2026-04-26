import { stdout, stdin } from 'node:process';
import { createInterface } from 'node:readline/promises';
import * as readline from 'node:readline';

// ─── Terminal capability detection ───────────────────────────────────────────

export const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function isInteractiveTerminal(): boolean {
  return Boolean(stdout.isTTY) && process.env.CI !== 'true';
}

export function supportsColorOutput(): boolean {
  if (!isInteractiveTerminal()) return false;
  if (process.env.NO_COLOR !== undefined) return false;
  return true;
}

// ─── ANSI primitives ─────────────────────────────────────────────────────────

function ansi(code: string, text: string, enabled = supportsColorOutput()): string {
  if (!enabled) return text;
  return `\x1b[${code}m${text}\x1b[0m`;
}

// Colors
export const c = {
  cyan:    (t: string) => ansi('36', t),
  cyanB:   (t: string) => ansi('96', t),
  green:   (t: string) => ansi('32', t),
  greenB:  (t: string) => ansi('92', t),
  yellow:  (t: string) => ansi('33', t),
  yellowB: (t: string) => ansi('93', t),
  red:     (t: string) => ansi('31', t),
  redB:    (t: string) => ansi('91', t),
  blue:    (t: string) => ansi('34', t),
  blueB:   (t: string) => ansi('94', t),
  magenta: (t: string) => ansi('35', t),
  white:   (t: string) => ansi('37', t),
  gray:    (t: string) => ansi('90', t),
  dim:     (t: string) => ansi('2', t),
  bold:    (t: string) => ansi('1', t),
  italic:  (t: string) => ansi('3', t),
  reset:   (t: string) => ansi('0', t),
};

/** Colorize with a raw ANSI code — legacy compat helper */
export function colorize(text: string, ansiCode: string, enabled = supportsColorOutput()): string {
  return ansi(ansiCode, text, enabled);
}

// ─── Icons ────────────────────────────────────────────────────────────────────

export const icons = {
  success: c.greenB('✓'),
  error:   c.redB('✗'),
  warn:    c.yellowB('⚠'),
  info:    c.blueB('ℹ'),
  bullet:  c.cyan('◆'),
  arrow:   c.dim('→'),
  dot:     c.dim('·'),
};

// ─── Banner ───────────────────────────────────────────────────────────────────

/**
 * Print a stylized Specman banner with version.
 */
export function printBanner(version = ''): void {
  if (!supportsColorOutput()) {
    console.log(`\nspecman${version ? ` v${version}` : ''} — AI-first spec management\n`);
    return;
  }

  const vTag  = version ? c.dim(`v${version}`) : '';
  const title = `${c.cyan('◆')} ${c.bold(c.cyanB('specman'))}  ${vTag}`;
  const sub   = c.dim('AI-first spec management');

  const innerW = 37;
  const top    = `  ${c.dim('╭' + '─'.repeat(innerW) + '╮')}`;
  const bot    = `  ${c.dim('╰' + '─'.repeat(innerW) + '╯')}`;
  const row1   = `  ${c.dim('│')}  ${title.padEnd(innerW + 14)}  ${c.dim('│')}`;
  const row2   = `  ${c.dim('│')}  ${sub}${''.padEnd(innerW - 27)}  ${c.dim('│')}`;

  console.log();
  console.log(top);
  console.log(row1);
  console.log(row2);
  console.log(bot);
  console.log();
}

// ─── Section headers ──────────────────────────────────────────────────────────

/**
 * Render a section divider: ── Title ─────────────────
 */
export function printSection(title: string): void {
  if (!supportsColorOutput()) {
    console.log(`\n--- ${title.toUpperCase()} ---\n`);
    return;
  }
  const width = 52;
  const label = ` ${title} `;
  const fill  = '─'.repeat(Math.max(0, width - label.length - 2));
  console.log();
  console.log(c.dim(`──${label}${fill}`));
  console.log();
}

/** Legacy alias */
export function printHeader(title: string): void {
  printSection(title);
}

// ─── Spinner / Loader ─────────────────────────────────────────────────────────

const BRAILLE_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

/**
 * Animated braille spinner wrapping an async task.
 */
export async function withLoader<T>(label: string, task: () => Promise<T>): Promise<T> {
  if (!isInteractiveTerminal()) {
    return task();
  }

  let i = 0;
  const interval = setInterval(() => {
    const frame = c.cyan(BRAILLE_FRAMES[i % BRAILLE_FRAMES.length]);
    stdout.write(`\r  ${frame}  ${c.dim(label)}   `);
    i++;
  }, 80);

  try {
    const result = await task();
    clearInterval(interval);
    stdout.write(`\r  ${icons.success}  ${label}   \n`);
    return result;
  } catch (error) {
    clearInterval(interval);
    stdout.write(`\r  ${icons.error}  ${label}   \n`);
    throw error;
  }
}

// ─── File tree ────────────────────────────────────────────────────────────────

/**
 * Print a colored file tree from pre-formatted lines (e.g. '├── foo.md').
 */
export function printTree(rootLabel: string, lines: string[]): void {
  console.log(`  ${c.cyanB(rootLabel)}`);
  for (const line of lines) {
    console.log(`  ${c.dim(line)}`);
  }
}

// ─── Summary box ──────────────────────────────────────────────────────────────

interface SummaryRow {
  icon?: string;
  label: string;
  value: string | number;
  color?: (s: string) => string;
}

/**
 * Print a bordered summary panel.
 */
export function printSummaryBox(rows: SummaryRow[]): void {
  if (!supportsColorOutput()) {
    for (const row of rows) {
      console.log(`  ${row.icon ?? ''} ${row.label}: ${row.value}`);
    }
    return;
  }

  const innerW = 36;
  console.log(`  ${c.dim('╭' + '─'.repeat(innerW) + '╮')}`);
  for (const row of rows) {
    const icon   = row.icon ? `${row.icon}  ` : '   ';
    const label  = c.dim(row.label);
    const val    = row.color ? row.color(String(row.value)) : c.bold(String(row.value));
    const raw    = `${icon}${row.label}  ${row.value}`;
    const padLen = Math.max(0, innerW - 2 - raw.length);
    console.log(`  ${c.dim('│')}  ${icon}${label}  ${val}${' '.repeat(padLen)}  ${c.dim('│')}`);
  }
  console.log(`  ${c.dim('╰' + '─'.repeat(innerW) + '╯')}`);
}

// ─── Status / list items ─────────────────────────────────────────────────────

/**
 * Print a single status line: `  icon  label  message`
 */
export function printStatusLine(icon: string, label: string, message = ''): void {
  const msg = message ? `  ${c.dim(message)}` : '';
  console.log(`  ${icon}  ${label}${msg}`);
}

/**
 * Print a bulleted list item.
 */
export function printBullet(text: string, dimSuffix = ''): void {
  const suffix = dimSuffix ? `  ${c.dim(dimSuffix)}` : '';
  console.log(`  ${icons.bullet}  ${text}${suffix}`);
}

/**
 * Print an action → result item used in plans/diffs.
 */
export function printPlanItem(path: string, action: string, note = ''): void {
  const colors: Record<string, (s: string) => string> = {
    create:         c.cyanB,
    'replace-block': c.yellow,
    'append-block': c.yellowB,
    'migrate-file': c.magenta,
    unchanged:      c.dim,
    delete:         c.redB,
    'strip-block':  c.yellow,
  };
  const colorFn = colors[action] ?? c.white;
  const noteStr = note ? `  ${c.dim(note)}` : '';
  console.log(`  ${c.dim('◆')}  ${c.dim(path)}  ${icons.arrow}  ${colorFn(action)}${noteStr}`);
}

// ─── Callout blocks ───────────────────────────────────────────────────────────

/**
 * Print a bordered callout block (info, warn, error).
 */
export function printCallout(type: 'info' | 'warn' | 'error', lines: string[]): void {
  if (!supportsColorOutput()) {
    const prefix = type === 'error' ? '[ERROR]' : type === 'warn' ? '[WARN]' : '[INFO]';
    for (const line of lines) console.log(`  ${prefix} ${line}`);
    return;
  }
  const colorFn = type === 'error' ? c.redB : type === 'warn' ? c.yellowB : c.blueB;
  const border  = colorFn('│');
  console.log();
  for (const line of lines) {
    console.log(`  ${border}  ${line}`);
  }
  console.log();
}

// ─── Selection menu ───────────────────────────────────────────────────────────

export interface MenuChoice<T extends string> {
  key: string;
  label: string;
  value: T;
}

/**
 * Render a numbered selection menu and return the chosen value.
 */
export async function selectMenu<T extends string>(
  title: string,
  choices: MenuChoice<T>[],
  defaultValue?: T,
): Promise<T> {
  printSection(title);

  if (!isInteractiveTerminal()) {
    return defaultValue ?? choices[choices.length - 1].value;
  }

  let selectedIndex = 0;
  if (defaultValue) {
    const idx = choices.findIndex(c => c.value === defaultValue);
    if (idx !== -1) selectedIndex = idx;
  }

  stdout.write('\x1B[?25l'); // hide cursor

  const render = () => {
    let output = '';
    for (let i = 0; i < choices.length; i++) {
      const choice = choices[i];
      const isSelected = i === selectedIndex;
      const prefix = isSelected ? c.cyan('❯') : ' ';
      const label = isSelected ? c.cyanB(choice.label) : choice.label;
      const hint = c.dim(`(${choice.key})`);
      output += `  ${prefix} ${label}  ${hint}\n`;
    }
    stdout.write(output);
  };

  const clearLines = (n: number) => {
    stdout.write(`\x1B[${n}A\x1B[J`);
  };

  render();

  return new Promise<T>((resolve) => {
    const onKeypress = (str: string, key: readline.Key) => {
      if (key && key.name === 'up') {
        selectedIndex = (selectedIndex - 1 + choices.length) % choices.length;
        clearLines(choices.length);
        render();
      } else if (key && key.name === 'down') {
        selectedIndex = (selectedIndex + 1) % choices.length;
        clearLines(choices.length);
        render();
      } else if (key && (key.name === 'return' || key.name === 'enter')) {
        cleanup();
        console.log();
        resolve(choices[selectedIndex].value);
      } else if (key && key.ctrl && key.name === 'c') {
        cleanup();
        process.exit(0);
      } else if (str) {
        const char = str.toLowerCase();
        const matchIndex = choices.findIndex(c => c.key.toLowerCase() === char);
        if (matchIndex !== -1) {
          selectedIndex = matchIndex;
          clearLines(choices.length);
          render();
          cleanup();
          console.log();
          resolve(choices[selectedIndex].value);
        }
      }
    };

    const cleanup = () => {
      stdout.write('\x1B[?25h'); // show cursor
      if (stdin.isTTY) {
        stdin.setRawMode(false);
      }
      stdin.removeListener('keypress', onKeypress);
      stdin.pause();
    };

    readline.emitKeypressEvents(stdin);
    if (stdin.isTTY) {
      stdin.setRawMode(true);
    }
    stdin.resume();
    stdin.on('keypress', onKeypress);
  });
}

// ─── Confirm prompt ───────────────────────────────────────────────────────────

/**
 * Styled [y/N] confirmation prompt.
 */
export async function confirm(question: string): Promise<boolean> {
  if (!isInteractiveTerminal()) return false;

  const rl = createInterface({ input: stdin, output: stdout });
  try {
    const prompt = supportsColorOutput()
      ? `  ${question} ${c.dim('[y/N]')} `
      : `  ${question} [y/N] `;

    const answer = (await rl.question(prompt)).trim().toLowerCase();
    return answer === 'y' || answer === 'yes';
  } finally {
    rl.close();
  }
}

// ─── Grouped result printer ───────────────────────────────────────────────────

export interface ResultItem {
  severity: 'ERROR' | 'WARN' | 'INFO';
  message: string;
  file?: string;
  line?: number;
}

/**
 * Print grouped ERROR / WARN / INFO results with color-coded blocks and a summary bar.
 */
export function printResults(results: ResultItem[]): void {
  const errors = results.filter(r => r.severity === 'ERROR');
  const warns  = results.filter(r => r.severity === 'WARN');
  const infos  = results.filter(r => r.severity === 'INFO');

  if (errors.length > 0) {
    printSection('Errors');
    for (const r of errors) {
      const loc = r.file ? c.dim(`  (${r.file}${r.line ? `:${r.line}` : ''})`) : '';
      console.log(`  ${icons.error}  ${r.message}${loc}`);
    }
  }

  if (warns.length > 0) {
    printSection('Warnings');
    for (const r of warns) {
      const loc = r.file ? c.dim(`  (${r.file}${r.line ? `:${r.line}` : ''})`) : '';
      console.log(`  ${icons.warn}  ${r.message}${loc}`);
    }
  }

  if (infos.length > 0) {
    printSection('Info');
    for (const r of infos) {
      console.log(`  ${icons.info}  ${r.message}`);
    }
  }

  // Summary bar
  console.log();
  const errPart  = errors.length > 0 ? c.redB(`${errors.length} error(s)`)   : c.dim(`0 errors`);
  const warnPart = warns.length  > 0 ? c.yellowB(`${warns.length} warning(s)`) : c.dim(`0 warnings`);
  const infoPart = c.dim(`${infos.length} info`);
  console.log(`  ${errPart}  ${warnPart}  ${infoPart}`);

  if (errors.length === 0 && warns.length === 0) {
    console.log();
    console.log(`  ${icons.success}  ${c.greenB('All checks passed')}`);
  } else if (errors.length > 0) {
    console.log();
    console.log(`  ${icons.error}  ${c.redB('Checks failed')}`);
  }
  console.log();
}
