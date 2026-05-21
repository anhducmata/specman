import React, { useState, useCallback } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import { readKB, KBData } from './kb.js';
import { Dashboard } from './views/Dashboard.js';
import { SessionsView } from './views/SessionsView.js';
import { DecisionsView } from './views/DecisionsView.js';
import { FeedbackView } from './views/FeedbackView.js';
import { HooksView } from './views/HooksView.js';

type View = 'dashboard' | 'sessions' | 'decisions' | 'feedback' | 'hooks';

const TABS: { key: string; label: string; id: View }[] = [
  { key: '1', label: 'Dashboard', id: 'dashboard' },
  { key: '2', label: 'Sessions', id: 'sessions' },
  { key: '3', label: 'Decisions', id: 'decisions' },
  { key: '4', label: 'Feedback', id: 'feedback' },
  { key: '5', label: 'Hooks', id: 'hooks' },
];

export function App() {
  const [view, setView] = useState<View>('dashboard');
  const [kb, setKb] = useState<KBData | null>(() => readKB());
  const { exit } = useApp();

  const refresh = useCallback(() => setKb(readKB()), []);

  useInput((input, key) => {
    if (input === 'q') exit();
    for (const tab of TABS) {
      if (input === tab.key) setView(tab.id);
    }
    if (key.leftArrow || key.rightArrow) {
      const currentIndex = TABS.findIndex(t => t.id === view);
      const next = key.rightArrow
        ? (currentIndex + 1) % TABS.length
        : (currentIndex - 1 + TABS.length) % TABS.length;
      setView(TABS[next].id);
    }
  });

  return (
    <Box flexDirection="column" minHeight={process.stdout.rows || 24}>
      <Header />
      <TabBar current={view} />

      <Box flexDirection="column" flexGrow={1} paddingX={2}>
        {!kb ? (
          <Box paddingY={1}>
            <Text color="red">No .specman/ found. Run </Text>
            <Text color="cyan">specman init</Text>
            <Text color="red"> first.</Text>
          </Box>
        ) : (
          <>
            {view === 'dashboard' && <Dashboard kb={kb} />}
            {view === 'sessions' && <SessionsView kb={kb} onRefresh={refresh} />}
            {view === 'decisions' && <DecisionsView kb={kb} onRefresh={refresh} />}
            {view === 'feedback' && <FeedbackView kb={kb} onRefresh={refresh} />}
            {view === 'hooks' && <HooksView kb={kb} onRefresh={refresh} />}
          </>
        )}
      </Box>

      <Footer />
    </Box>
  );
}

function Header() {
  return (
    <Box paddingX={2} paddingY={0}>
      <Text color="blueBright" bold>▶ specman</Text>
      <Text dimColor> — AI session knowledge base</Text>
    </Box>
  );
}

function TabBar({ current }: { current: View }) {
  return (
    <Box paddingX={1} gap={1} borderStyle="single" borderTop={false} borderLeft={false} borderRight={false}>
      {TABS.map(tab => (
        <Box key={tab.id} paddingX={1}>
          <Text
            color={current === tab.id ? 'cyan' : 'gray'}
            bold={current === tab.id}
            underline={current === tab.id}
          >
            [{tab.key}] {tab.label}
          </Text>
        </Box>
      ))}
    </Box>
  );
}

function Footer() {
  return (
    <Box paddingX={2} paddingY={0} borderStyle="single" borderBottom={false} borderLeft={false} borderRight={false}>
      <Text dimColor>[1-5] switch view  [←→] switch tab  [n] new  [↑↓] navigate  [q] quit</Text>
    </Box>
  );
}
