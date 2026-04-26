import { join } from 'node:path';
import { loadConfig } from '../core/config.js';
import { listFilesRecursive, readTextFile } from '../core/files.js';
import { icons, withLoader } from '../core/ui.js';

/**
 * Search specs, ADRs, domain rules, and solved cases.
 */
export async function searchCommand(root: string, query: string): Promise<void> {
  if (!query || query.trim().length === 0) {
    console.log(`${icons.error} Please provide a search query. Usage: specman search <query>`);
    process.exit(1);
  }

  const config = await loadConfig(root);
  const specsDir = join(root, config.specsDir);
  const queryLower = query.toLowerCase();

  const results = await withLoader(`Searching for "${query}"`, async () => {
    const allFiles = await listFilesRecursive(specsDir);
    const textFiles = allFiles.filter(f =>
      f.endsWith('.md') || f.endsWith('.yaml') || f.endsWith('.yml'),
    );

    const fileResults: { file: string; matches: { line: number; text: string }[] }[] = [];
    let totalMatches = 0;

    for (const file of textFiles) {
      const content = await readTextFile(file);
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
        const highlighted = highlightMatch(m.text, query);
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
function highlightMatch(text: string, query: string): string {
  const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
  return text.replace(regex, '\x1b[33m$1\x1b[0m'); // Yellow highlight
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
