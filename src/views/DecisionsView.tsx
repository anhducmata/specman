import React, { useState, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { execSync } from 'child_process';
import { KBData } from '../kb.js';

interface Props {
  kb: KBData;
  onRefresh: () => void;
}

function statusColor(status: string): string {
  if (status === 'accepted') return 'green';
  if (status === 'rejected') return 'red';
  if (status === 'proposed') return 'yellow';
  return 'gray';
}

export function DecisionsView({ kb, onRefresh }: Props) {
  const [cursor, setCursor] = useState(0);
  const [mode, setMode] = useState<'list' | 'new' | 'message'>('list');
  const [slug, setSlug] = useState('');
  const [message, setMessage] = useState('');

  const decisions = kb.decisions;

  useInput((input, key) => {
    if (mode !== 'list') return;
    if (key.upArrow) setCursor(c => Math.max(0, c - 1));
    if (key.downArrow) setCursor(c => Math.min(decisions.length - 1, c + 1));
    if (input === 'n') { setSlug(''); setMode('new'); }
  });

  const submitNew = useCallback(() => {
    if (!slug.trim()) { setMode('list'); return; }
    try {
      execSync(`specman decision new ${slug.trim()}`, { cwd: kb.projectDir });
      onRefresh();
      setMessage(`Decision created: ${slug.trim()}`);
    } catch (err: unknown) {
      setMessage(`Error: ${err instanceof Error ? err.message : String(err)}`);
    }
    setSlug('');
    setMode('message');
  }, [slug, kb.projectDir, onRefresh]);

  if (mode === 'new') {
    return (
      <Box flexDirection="column" paddingY={1} gap={1}>
        <Text bold>New decision slug:</Text>
        <Box>
          <Text color="cyan">› </Text>
          <TextInput value={slug} onChange={setSlug} onSubmit={submitNew} placeholder="e.g. use-ink-for-ui" />
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
        <MessageDismiss onDismiss={() => setMode('list')} />
      </Box>
    );
  }

  return (
    <Box flexDirection="column" paddingY={1} gap={1}>
      <Text bold>{decisions.length} decisions</Text>

      {decisions.length === 0 && (
        <Text dimColor>No decisions yet. Press [n] to record one.</Text>
      )}

      {decisions.map((d, i) => (
        <Box key={d.file} gap={2}>
          <Text>{i === cursor ? '›' : ' '}</Text>
          <Text dimColor color={statusColor(d.status)}>■</Text>
          <Text dimColor>{d.id}</Text>
          <Text color={i === cursor ? 'white' : undefined}>{d.slug}</Text>
          <Text dimColor>{d.date}</Text>
        </Box>
      ))}

      <Box marginTop={1}>
        <Text dimColor>[n] new decision  [↑↓] navigate</Text>
      </Box>
    </Box>
  );
}

function MessageDismiss({ onDismiss }: { onDismiss: () => void }) {
  useInput(() => onDismiss());
  return null;
}
