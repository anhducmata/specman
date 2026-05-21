import React, { useState, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { execSync } from 'child_process';
import { KBData } from '../kb.js';

interface Props {
  kb: KBData;
  onRefresh: () => void;
}

function outcomeColor(outcome: string): string {
  if (outcome === 'positive') return 'green';
  if (outcome === 'negative') return 'red';
  if (outcome === 'mixed') return 'yellow';
  return 'gray';
}

export function FeedbackView({ kb, onRefresh }: Props) {
  const [cursor, setCursor] = useState(0);
  const [mode, setMode] = useState<'list' | 'new' | 'message'>('list');
  const [slug, setSlug] = useState('');
  const [message, setMessage] = useState('');

  const feedback = kb.feedback;

  useInput((input, key) => {
    if (mode !== 'list') return;
    if (key.upArrow) setCursor(c => Math.max(0, c - 1));
    if (key.downArrow) setCursor(c => Math.min(feedback.length - 1, c + 1));
    if (input === 'n') { setSlug(''); setMode('new'); }
  });

  const submitNew = useCallback(() => {
    if (!slug.trim()) { setMode('list'); return; }
    try {
      execSync(`specman feedback new ${slug.trim()}`, { cwd: kb.projectDir });
      onRefresh();
      setMessage(`Feedback created: ${slug.trim()}`);
    } catch (err: unknown) {
      setMessage(`Error: ${err instanceof Error ? err.message : String(err)}`);
    }
    setSlug('');
    setMode('message');
  }, [slug, kb.projectDir, onRefresh]);

  if (mode === 'new') {
    return (
      <Box flexDirection="column" paddingY={1} gap={1}>
        <Text bold>New feedback slug:</Text>
        <Box>
          <Text color="cyan">› </Text>
          <TextInput value={slug} onChange={setSlug} onSubmit={submitNew} placeholder="e.g. ink-ui-worked-well" />
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
      <Text bold>{feedback.length} feedback records</Text>

      {feedback.length === 0 && (
        <Text dimColor>No feedback yet. Press [n] to record an outcome.</Text>
      )}

      {feedback.map((f, i) => (
        <Box key={f.file} gap={2}>
          <Text>{i === cursor ? '›' : ' '}</Text>
          <Text color={outcomeColor(f.outcome)}>
            {f.outcome === 'positive' ? '↑' : f.outcome === 'negative' ? '↓' : '~'}
          </Text>
          <Text dimColor>{f.id}</Text>
          <Text color={i === cursor ? 'white' : undefined}>{f.slug}</Text>
          <Text dimColor>{f.date}</Text>
        </Box>
      ))}

      <Box marginTop={1}>
        <Text dimColor>[n] new feedback  [↑↓] navigate</Text>
      </Box>
    </Box>
  );
}

function MessageDismiss({ onDismiss }: { onDismiss: () => void }) {
  useInput(() => onDismiss());
  return null;
}
