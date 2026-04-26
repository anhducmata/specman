import { spawn } from 'node:child_process';
import { icons } from './ui.js';

export type AssistantCli = 'claude' | 'codex' | 'cursor';

const assistants: AssistantCli[] = ['claude', 'codex', 'cursor'];

export function normalizeAssistant(value?: string): AssistantCli | null {
  if (!value) return null;
  const normalized = value.toLowerCase();
  return assistants.includes(normalized as AssistantCli) ? normalized as AssistantCli : null;
}

export function suggestAssistant(value?: string): AssistantCli | null {
  if (!value) return null;
  const normalized = value.toLowerCase().trim();
  const exact = normalizeAssistant(normalized);
  if (exact) return exact;

  const prefixMatch = assistants.find(assistant => assistant.startsWith(normalized) || normalized.startsWith(assistant));
  if (prefixMatch) return prefixMatch;

  let best: { assistant: AssistantCli; distance: number } | null = null;
  for (const assistant of assistants) {
    const distance = levenshtein(normalized, assistant);
    if (best === null || distance < best.distance) {
      best = { assistant, distance };
    }
  }

  return best && best.distance <= 2 ? best.assistant : null;
}

export async function runAssistant(root: string, assistant: AssistantCli, prompt: string): Promise<void> {
  if (assistant === 'cursor') {
    console.log(`${icons.warn} Cursor does not expose a stable local CLI for this workflow yet.`);
    console.log('Use this prompt in Cursor Agent instead:\n');
    console.log(prompt);
    return;
  }

  const command = assistant === 'claude' ? 'claude' : 'codex';
  const args = assistant === 'claude' ? ['--print', prompt] : [prompt];

  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { cwd: root, stdio: 'inherit' });
    child.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') {
        console.log(`${icons.error} ${command} CLI was not found in PATH.`);
        console.log('Use `specman init --prompt` to print the prompt instead.');
        resolve();
        return;
      }
      reject(error);
    });
    child.on('close', (code) => {
      if (code && code !== 0) {
        reject(new Error(`${command} exited with code ${code}`));
        return;
      }
      resolve();
    });
  });
}

export function specsPrompt(): string {
  return `You are helping document this repository with specman.

Task:
1. Inspect the repository structure and existing source files.
2. Create or update the files under \`specs/\` using the existing specman structure.
3. Fill in product requirements, engineering rules, architecture notes, domain rules, ADR context, and open questions.
4. Keep uncertain claims as draft assumptions.
5. Do not include secrets, raw production logs, customer data, or PII.

Output:
- If you can edit files directly, update the \`specs/\` files.
- If you cannot edit files directly, return markdown content grouped by target file path.`;
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const curr = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        curr[j - 1] + 1,
        prev[j] + 1,
        prev[j - 1] + cost,
      );
    }
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j];
  }

  return prev[b.length];
}
