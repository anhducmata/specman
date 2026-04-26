import { join } from 'node:path';
import { loadConfig } from '../core/config.js';
import { listFilesRecursive, mapWithConcurrency, readTextFile } from '../core/files.js';
import { colorize, icons, supportsColorOutput, withLoader } from '../core/ui.js';

interface SearchCommandOptions {
  color?: boolean;
}

/**
 * Search specs, ADRs, domain rules, and solved cases.
 */
export async function searchCommand(root: string, query: string, options: SearchCommandOptions = {}): Promise<void> {
  if (!query || query.trim().length === 0) {
    console.log(`${icons.error} Please provide a search query. Usage: specman search <query>`);
    process.exit(1);
  }

  const config = await loadConfig(root);
  const specsDir = join(root, config.specsDir);
  const queryLower = query.toLowerCase();

  const shouldColor = (options.color ?? true) && supportsColorOutput();

  const results = await withLoader(`Searching for "${query}"`, async () => {
    const allFiles = await listFilesRecursive(specsDir);
    const textFiles = allFiles.filter(f =>
      f.endsWith('.md') || f.endsWith('.yaml') || f.endsWith('.yml'),
    );

    const fileResults: { file: string; matches: { line: number; text: string }[] }[] = [];
    let totalMatches = 0;

    const contents = await mapWithConcurrency(textFiles, 8, async (file) => ({
      file,
      content: await readTextFile(file),
    }));

    for (const entry of contents) {
      const { file, content } = entry;
      if (!content) continue;

      const lines = content.split('\n');
      const matches: { line: number; text: string }[] = [];

      for (let i = 0; i < lines.length; i++) {
        if (lines[i].toLowerCase().includes(queryLower)) {
          matches.push({ line: i + 1, text: lines[i].trim() });
        }
      }

      if (matches.length > 0) {
        fileResults.push({ file, matches });
        totalMatches += matches.length;
      }
    }
    return { fileResults, totalMatches };
  });

  if (results.fileResults.length === 0) {
    console.log('No matches found.');
  } else {
    for (const res of results.fileResults) {
      const relativePath = res.file.replace(root + '/', '');
      console.log(`· ${relativePath} (${res.matches.length} match${res.matches.length > 1 ? 'es' : ''}):`);

      const showMatches = res.matches.slice(0, 5);
      for (const m of showMatches) {
        const highlighted = highlightMatch(m.text, query, shouldColor);
        console.log(`   L${m.line}: ${highlighted}`);
      }

      if (res.matches.length > 5) {
        console.log(`   ... and ${res.matches.length - 5} more match(es)`);
      }
      console.log();
    }
    console.log(`Found ${results.totalMatches} match(es) in ${results.fileResults.length} file(s).`);
  }
}

/**
 * Highlight matching text in a line (case-insensitive).
 */
function highlightMatch(text: string, query: string, enableColor: boolean): string {
  const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
  return text.replace(regex, (matched) => colorize(matched, '33', enableColor)); // Yellow highlight
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
