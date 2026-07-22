#!/usr/bin/env node
// Flatten an export directory into one token-lean transcript for the digest step.
// Usage: node compact.mjs exports/2026-07-19 > transcript.md

import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const dir = process.argv[2];
if (!dir) { console.error('Usage: node compact.mjs <export-dir>'); process.exit(1); }

const files = (await readdir(dir)).filter((f) => f.endsWith('.json') && !['manifest.json', 'recap.json'].includes(f));
for (const file of files) {
  const { channel, messages } = JSON.parse(await readFile(join(dir, file), 'utf8'));
  if (!Array.isArray(messages)) continue; // not a channel export (e.g. leftovers from a rerun)
  const humans = messages.filter((m) => !m.bot && (m.content || m.attachments.length || m.embeds.length));
  if (!humans.length) continue;
  console.log(`\n## #${channel} (${humans.length} messages)\n`);
  for (const m of humans) {
    const links = [...m.attachments.map((a) => a.url), ...m.embeds.map((e) => e.url).filter(Boolean)];
    const extra = links.length ? ` [links: ${links.join(' ')}]` : '';
    const hot = m.reactions >= 3 ? ` [${m.reactions} reactions]` : '';
    console.log(`- ${m.ts.slice(5, 16)} ${m.author}: ${m.content.replace(/\n+/g, ' / ')}${extra}${hot}`);
  }
}
