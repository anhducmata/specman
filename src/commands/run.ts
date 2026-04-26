import { join } from 'node:path';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { loadConfig, loadStatus } from '../core/config.js';
import {
  icons,
  printSection,
  printCallout,
  c,
  selectMenu,
  isInteractiveTerminal,
  confirm,
} from '../core/ui.js';
import {
  detectAvailableAssistants,
  runAssistantNonInteractive,
  autoPlanPrompt,
  autoStepPrompt,
  type AssistantCli,
} from '../core/ai.js';

interface RunOptions {
  resume?: boolean;
  with?: string;
}

export async function runCommand(root: string, goalArgs: string[], options: RunOptions = {}): Promise<void> {
  const config = await loadConfig(root);
  const status = await loadStatus(root);

  if (!status.initialized) {
    console.log(`  ${icons.error}  specman has not been initialized. Run ${c.cyan('specman init')} first.`);
    process.exit(1);
  }

  const specsDir = join(root, config.specsDir);
  const planPath = join(root, '.specman', 'plan.md');

  // Parse Goal
  const goal = goalArgs.join(' ').trim();
  const hasPlan = existsSync(planPath);

  if (!goal && !hasPlan) {
    console.log(`  ${icons.error}  Please provide a goal. Example: ${c.cyan('specman run "Implement login feature"')}`);
    process.exit(1);
  }

  if (hasPlan && !options.resume && goal) {
    printCallout('warn', [
      `A previous plan exists at ${c.cyan('.specman/plan.md')}.`,
      `Running with a new goal will overwrite it.`,
    ]);
    if (isInteractiveTerminal()) {
      const ok = await confirm('Overwrite existing plan?');
      if (!ok) {
        console.log(`\n  ${icons.info}  Cancelled. Use ${c.cyan('specman run --resume')} to continue the existing plan.`);
        return;
      }
    }
  }

  // Detect AI
  const available = await detectAvailableAssistants();
  if (available.length === 0) {
    console.log(`  ${icons.error}  No supported AI CLI found (claude or codex).`);
    return;
  }

  let chosen: AssistantCli = available[0];
  if (options.with) {
    if (available.includes(options.with as AssistantCli)) {
      chosen = options.with as AssistantCli;
    } else {
      console.log(`  ${icons.error}  Requested assistant ${c.cyan(options.with)} is not available.`);
      return;
    }
  } else if (available.length > 1 && isInteractiveTerminal()) {
    chosen = await selectMenu(
      'Choose AI CLI for execution',
      available.map((a, i) => ({ key: String(i + 1), label: a, value: a })),
      chosen,
    );
  }

  printSection(`AI Task Runner — ${c.bold(chosen)}`);

  // --- Phase 1: Planning ---
  if (!hasPlan || (!options.resume && goal)) {
    console.log(`  ${icons.info}  Generating execution plan...`);
    const prompt = autoPlanPrompt(specsDir, goal);
    // Write plan prompt to AI, AI writes to .specman/plan.md
    await runAssistantNonInteractive(root, chosen, prompt, true);
    
    if (!existsSync(planPath)) {
      console.log(`  ${icons.error}  The AI failed to create ${c.cyan('.specman/plan.md')}.`);
      return;
    }
    console.log(`  ${icons.success}  Plan generated at ${c.cyan('.specman/plan.md')}`);
  } else {
    console.log(`  ${icons.info}  Resuming existing plan from ${c.cyan('.specman/plan.md')}`);
  }

  // --- Phase 2: Execution Loop ---
  let planContent = readFileSync(planPath, 'utf-8');
  let tasks = parseTasks(planContent);
  let uncompletedTasks = tasks.filter(t => !t.completed);

  if (uncompletedTasks.length === 0) {
    console.log(`  ${icons.success}  All tasks in the plan are already completed!`);
    return;
  }

  console.log(`  ${icons.info}  Found ${c.cyanB(String(uncompletedTasks.length))} uncompleted tasks.`);

  for (const task of tasks) {
    if (task.completed) continue;

    console.log();
    printSection(`Executing Task: ${task.description}`);
    const prompt = autoStepPrompt(specsDir, goal || 'Continue existing plan', task.description, planContent);

    try {
      await runAssistantNonInteractive(root, chosen, prompt, true);
      // Mark as done
      planContent = planContent.replace(task.rawLine, task.rawLine.replace('- [ ]', '- [x]'));
      writeFileSync(planPath, planContent, 'utf-8');
      console.log(`  ${icons.success}  Marked task as completed in plan.`);
    } catch (err) {
      console.log(`  ${icons.error}  Task failed or was interrupted.`);
      console.log(`  Run ${c.cyan('specman run --resume')} to try again.`);
      process.exit(1);
    }
  }

  console.log();
  console.log(`  ${icons.success}  ${c.greenB('All tasks completed successfully!')}`);
}

interface TaskInfo {
  rawLine: string;
  description: string;
  completed: boolean;
}

function parseTasks(content: string): TaskInfo[] {
  const lines = content.split('\n');
  const tasks: TaskInfo[] = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('- [ ] ')) {
      tasks.push({
        rawLine: line,
        description: trimmed.substring(6).trim(),
        completed: false,
      });
    } else if (trimmed.startsWith('- [x] ') || trimmed.startsWith('- [X] ')) {
      tasks.push({
        rawLine: line,
        description: trimmed.substring(6).trim(),
        completed: true,
      });
    }
  }
  return tasks;
}
