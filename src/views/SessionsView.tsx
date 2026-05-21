import React, { useState, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { execSync } from 'child_process';
import { KBData, Session } from '../kb.js';

interface Props {
  kb: KBData;
  onRefresh: () => void;
}

function statusColor(status: string): string {
  if (status === 'in-progress') return 'yellow';
  if (status === 'completed') return 'green';
  if (status === 'auto-saved') return 'blue';
  return 'gray';
}

function statusIcon(status: string): string {
  if (status === 'in-progress') return '●';
  if (status === 'completed') return '✓';
  return '○';
}

export function SessionsView({ kb, onRefresh }: Props) {
  const [cursor, setCursor] = useState(0);
  const [mode, setMode] = useState<'list' | 'new' | 'message'>('list');
  const [slug, setSlug] = useState('');
  const [message, setMessage] = useState('');

  const sessions = kb.sessions;
  const activeFile = kb.activeSession;

  useInput((input, key) => {
    if (mode !== 'list') return;

    if (key.upArrow) setCursor(c => Math.max(0, c - 1));
    if (key.downArrow) setCursor(c => Math.min(sessions.length - 1, c + 1));
    if (input === 'n') { setSlug(''); setMode('new'); }
    if (input === 'e') {
      if (!activeFile) { setMessage('No active session.'); setMode('message'); return; }
      try {
        execSync('specman session end', { cwd: kb.projectDir });
        onRefresh();
        setMessage('Session ended.');
      } catch (err: unknown) {
        setMessage(`Error: ${err instanceof Error ? err.message : String(err)}`);
      }
      setMode('message');
    }
  });

  const submitNew = useCallback(() => {
    if (!slug.trim()) { setMode('list'); return; }
    try {
      execSync(`specman session new ${slug.trim()}`, { cwd: kb.projectDir });
      onRefresh();
      setMessage(`Session started: ${slug.trim()}`);
    } catch (err: unknown) {
      setMessage(`Error: ${err instanceof Error ? err.message : String(err)}`);
    }
    setSlug('');
    setMode('message');
  }, [slug, kb.projectDir, onRefresh]);

  if (mode === 'new') {
    return (
      <Box flexDirection="column" paddingY={1} gap={1}>
        <Text bold>New session slug:</Text>
        <Box>
          <Text color="cyan">› </Text>
          <TextInput
            value={slug}
            onChange={setSlug}
            onSubmit={submitNew}
            placeholder="e.g. add-ink-ui"
          />
        </Box>
        <Text dimColor>Enter to create · Esc to cancel</Text>
      </Box>
    );
  }

  if (mode === 'message') {
    return (
      <Box flexDirection="column" paddingY={1} gap={1}>
        <Text>{message}</Text>
        <Text dimColor>Press any key to continue</Text>
        {/* useInput in message mode */}
        <MessageDismiss onDismiss={() => setMode('list')} />
      </Box>
    );
  }

  return (
    <Box flexDirection="column" paddingY={1} gap={1}>
      <Box gap={2}>
        <Text bold>{sessions.length} sessions</Text>
        {activeFile && <Text color="yellow">● active session</Text>}
      </Box>

      {sessions.length === 0 && (
        <Text dimColor>No sessions yet. Press [n] to start one.</Text>
      )}

      {sessions.map((s, i) => (
        <Box key={s.file} gap={2}>
          <Text>{i === cursor ? '›' : ' '}</Text>
          <Text color={statusColor(s.status)}>{statusIcon(s.status)}</Text>
          <Text dimColor>{s.date}</Text>
          <Text color={i === cursor ? 'white' : undefined}>{s.slug}</Text>
          <Text dimColor color={statusColor(s.status)}>{s.status}</Text>
        </Box>
      ))}

      <Box marginTop={1}>
        <Text dimColor>[n] new session  [e] end active  [↑↓] navigate</Text>
      </Box>
    </Box>
  );
}

function MessageDismiss({ onDismiss }: { onDismiss: () => void }) {
  useInput(() => onDismiss());
  return null;
}
