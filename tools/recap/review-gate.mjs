#!/usr/bin/env node
// Read both persona reviews, print what they said, and decide what happens next.
// Usage: node review-gate.mjs <exportDir>
// Exit 0: nothing to change (or no usable reviews), ship the draft as rendered.
// Exit 10: notes exist; run the revision pass on revise-input.md, then re-render.
//
// ADVISORY since 2026-08-08: reviewers can no longer stop the post. A "block"
// verdict is demoted to revision notes (the reaction itself becomes a note when
// the reviewer gave none), and a missing or unreadable review is skipped with a
// warning. The post always goes out; Kevin and the team edit live after.

import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const dir = process.argv[2];
if (!dir) { console.error('Usage: node review-gate.mjs <exportDir>'); process.exit(1); }

const load = async (name, who) => {
  let r;
  try {
    r = JSON.parse(await readFile(join(dir, name), 'utf8'));
  } catch {
    console.error(`⚠ ${who}: no usable review on disk; shipping without this perspective`);
    return null;
  }
  const verdict = String(r.verdict || '').toLowerCase();
  if (!['ship', 'revise', 'block'].includes(verdict)) {
    console.error(`⚠ ${who} returned an unusable verdict "${r.verdict}"; shipping without this perspective`);
    return null;
  }
  return { who, verdict, reaction: r.reaction || '', dropOffPoint: r.dropOffPoint || '', notes: r.notes || [] };
};

const reviews = (await Promise.all([
  load('review-member.json', 'MEMBER (Discord post)'),
  load('review-skeptic.json', 'SKEPTIC (public page)'),
])).filter(Boolean);

for (const r of reviews) {
  console.log(`\n--- ${r.who}: ${r.verdict.toUpperCase()} ---`);
  console.log(`  "${r.reaction}"`);
  if (r.dropOffPoint) console.log(`  stops reading at: ${r.dropOffPoint}`);
  for (const n of r.notes) console.log(`  • [${n.target}] ${n.problem}\n    → ${n.fix}`);
}

for (const r of reviews.filter((r) => r.verdict === 'block')) {
  console.error(`\n⚠ ${r.who} would have BLOCKED this. Advisory mode: demoting to revision notes; the post still goes out. Read the reaction above.`);
  if (!r.notes.length) {
    // a block with no notes still carries its reason in the reaction; give the
    // revision pass something concrete to act on rather than dropping it
    r.notes = [{ target: 'whole draft', problem: r.reaction || 'reviewer blocked without notes', fix: 'address the reviewer\'s reaction' }];
  }
}

const notes = reviews.flatMap((r) => r.notes.map((n) => ({ ...n, from: r.who })));
if (!notes.length) {
  console.log('\n✓ Nothing to change. Shipping the draft as rendered.');
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
