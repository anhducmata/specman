import React from 'react';
import { Box, Text } from 'ink';
import { KBData } from '../kb.js';

interface Props {
  kb: KBData;
}

function statusColor(status: string): string {
  if (status === 'in-progress') return 'yellow';
  if (status === 'completed') return 'green';
  if (status === 'auto-saved') return 'blue';
  return 'gray';
}

export function Dashboard({ kb }: Props) {
  const recentSessions = kb.sessions.slice(0, 7);
  const activeFile = kb.activeSession;
  const activeSlug = activeFile
    ? kb.sessions.find(s => s.file === activeFile)?.slug ?? activeFile.split('/').pop()
    : null;

  return (
    <Box flexDirection="column" gap={1} paddingY={1}>
      <Box gap={4}>
        <Box flexDirection="column" borderStyle="round" paddingX={2} paddingY={1}>
          <Text bold color="white">{kb.sessions.length}</Text>
          <Text dimColor>sessions</Text>
        </Box>
        <Box flexDirection="column" borderStyle="round" paddingX={2} paddingY={1}>
          <Text bold color="white">{kb.decisions.length}</Text>
          <Text dimColor>decisions</Text>
        </Box>
        <Box flexDirection="column" borderStyle="round" paddingX={2} paddingY={1}>
          <Text bold color="white">{kb.feedback.length}</Text>
          <Text dimColor>feedback</Text>
        </Box>
      </Box>

      <Box flexDirection="column">
        <Text bold>Active session</Text>
        {activeSlug ? (
          <Text color="yellow">● {activeSlug}</Text>
        ) : (
          <Text dimColor>none</Text>
        )}
      </Box>

      <Box flexDirection="column">
        <Text bold>Recent sessions</Text>
        {recentSessions.length === 0 && <Text dimColor>none yet</Text>}
        {recentSessions.map(s => (
          <Box key={s.file} gap={2}>
            <Text color={statusColor(s.status)}>
              {s.status === 'in-progress' ? '●' : s.status === 'completed' ? '✓' : '○'}
            </Text>
            <Text dimColor>{s.date}</Text>
            <Text>{s.slug}</Text>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
