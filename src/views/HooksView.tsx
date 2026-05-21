import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { execSync } from 'child_process';
import { KBData, getHooksStatus } from '../kb.js';

interface Props {
  kb: KBData;
  onRefresh: () => void;
}

const HOOK_DESCRIPTIONS: Record<string, string> = {
  stop: 'Auto-save session on Claude exit (core)',
  'session-start': 'Inject Tier 1 KB into every session context',
  'auto-session': 'Auto-start a session on first prompt',
  guard: 'Warn on dangerous shell commands',
  'auto-stage': 'Track edited files in active session log',
  'pre-compact': 'Git snapshot before context compaction',
};

const TOGGLEABLE = ['session-start', 'auto-session', 'guard', 'auto-stage', 'pre-compact'];

export function HooksView({ kb, onRefresh }: Props) {
  const [cursor, setCursor] = useState(0);
  const [message, setMessage] = useState('');

  const hooks = getHooksStatus(kb.projectDir);
  const hookEntries = Object.entries(HOOK_DESCRIPTIONS);

  useInput((input, key) => {
    if (key.upArrow) setCursor(c => Math.max(0, c - 1));
    if (key.downArrow) setCursor(c => Math.min(hookEntries.length - 1, c + 1));
    if (key.return || input === ' ') {
      const [name] = hookEntries[cursor] ?? [];
      if (!name || !TOGGLEABLE.includes(name)) {
        setMessage(`Hook "${name}" is core and cannot be toggled.`);
        return;
      }
      const enabled = hooks[name];
      try {
        execSync(`specman hooks ${enabled ? 'disable' : 'enable'} ${name}`, { cwd: kb.projectDir });
        onRefresh();
        setMessage(`Hook "${name}" ${enabled ? 'disabled' : 'enabled'}.`);
      } catch (err: unknown) {
        setMessage(`Error: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  });

  return (
    <Box flexDirection="column" paddingY={1} gap={1}>
      <Text bold>Hooks</Text>

      {hookEntries.map(([name, desc], i) => {
        const enabled = hooks[name] ?? false;
        const isCore = !TOGGLEABLE.includes(name);
        return (
          <Box key={name} gap={2}>
            <Text>{i === cursor ? '›' : ' '}</Text>
            <Text color={enabled ? 'green' : 'gray'}>
              {enabled ? '●' : '○'}
            </Text>
            <Text bold={i === cursor} color={i === cursor ? 'white' : undefined}>
              {name}
            </Text>
            {isCore && <Text dimColor>(core)</Text>}
            <Text dimColor>{desc}</Text>
          </Box>
        );
      })}

      {message && (
        <Box marginTop={1}>
          <Text color="cyan">{message}</Text>
        </Box>
      )}

      <Box marginTop={1}>
        <Text dimColor>[Enter/Space] toggle  [↑↓] navigate</Text>
      </Box>
    </Box>
  );
}
