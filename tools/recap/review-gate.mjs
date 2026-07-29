#!/usr/bin/env node
// Read both persona reviews, print what they said, and decide what happens next.
// Usage: node review-gate.mjs <exportDir>
// Exit 0: nothing to change, ship the draft as rendered.
// Exit 10: notes exist; run the revision pass on revise-input.md, then re-render.
// Exit 3: a reviewer blocked. Nothing is published or posted.

import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const dir = process.argv[2];
if (!dir) { console.error('Usage: node review-gate.mjs <exportDir>'); process.exit(1); }

const load = async (name, who) => {
  const r = JSON.parse(await readFile(join(dir, name), 'utf8'));
  const verdict = String(r.verdict || '').toLowerCase();
  if (!['ship', 'revise', 'block'].includes(verdict)) {
    // an unreadable verdict is not permission to publish
    console.error(`⚠ ${who} returned an unusable verdict "${r.verdict}"; treating as block`);
    return { who, verdict: 'block', reaction: 'review did not come back in a usable shape', notes: [] };
  }
  return { who, verdict, reaction: r.reaction || '', dropOffPoint: r.dropOffPoint || '', notes: r.notes || [] };
};

const reviews = [
  await load('review-member.json', 'MEMBER (Discord post)'),
  await load('review-skeptic.json', 'SKEPTIC (public page)'),
];

for (const r of reviews) {
  console.log(`\n--- ${r.who}: ${r.verdict.toUpperCase()} ---`);
  console.log(`  "${r.reaction}"`);
  if (r.dropOffPoint) console.log(`  stops reading at: ${r.dropOffPoint}`);
  for (const n of r.notes) console.log(`  • [${n.target}] ${n.problem}\n    → ${n.fix}`);
}

const blocked = reviews.filter((r) => r.verdict === 'block');
if (blocked.length) {
  console.error(`\n✗ BLOCKED by ${blocked.map((r) => r.who).join(' and ')}. Nothing published, nothing posted.`);
  console.error('  Read the reactions above, fix by hand, then rerun tools/recap/run.sh.');
  process.exit(3);
}

const notes = reviews.flatMap((r) => r.notes.map((n) => ({ ...n, from: r.who })));
if (!notes.length) {
  console.log('\n✓ Both reviewers would ship it as drafted. No revision pass needed.');
  process.exit(0);
}

const recap = await readFile(join(dir, 'recap.json'), 'utf8');
await writeFile(join(dir, 'revise-input.md'), [
  '## Reviewer notes',
  '',
  ...notes.map((n) => `- From ${n.from}, on \`${n.target}\`: ${n.problem}\n  Suggested fix: ${n.fix}`),
  '',
  '## Current recap JSON',
  '',
  '```json',
  recap.trim(),
  '```',
  '',
].join('\n'));

console.log(`\n→ ${notes.length} note(s) to apply. Running the revision pass.`);
process.exit(10);
