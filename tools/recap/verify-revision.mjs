#!/usr/bin/env node
// Prove the revision pass only rewrote copy. It is an LLM editing a JSON blob, so it is
// entirely capable of "improving" a URL or a stat. Those are receipts, not prose.
// Usage: node verify-revision.mjs <before.json> <after.json>
// Exit 0: safe to use the revision. Exit 1: discard it and ship the pre-revision draft.

import { readFile } from 'node:fs/promises';

const [beforePath, afterPath] = process.argv.slice(2);
const a = JSON.parse(await readFile(beforePath, 'utf8'));
const b = JSON.parse(await readFile(afterPath, 'utf8'));
const problems = [];

const same = (x, y) => JSON.stringify(x) === JSON.stringify(y);
if (!same(a.stats, b.stats)) problems.push('stats changed; they are computed, not editorial');
if (!same(a.week, b.week)) problems.push('week changed');

if (a.goodyBag.length !== b.goodyBag.length) {
  problems.push(`goody bag went from ${a.goodyBag.length} to ${b.goodyBag.length} items; it is never trimmed`);
}
const urls = (x) => x.goodyBag.map((g) => g.url).sort();
if (!same(urls(a), urls(b))) {
  const before = new Set(urls(a)), after = new Set(urls(b));
  for (const u of after) if (!before.has(u)) problems.push(`invented or edited URL: ${u}`);
  for (const u of before) if (!after.has(u)) problems.push(`dropped URL: ${u}`);
}
const freebies = b.goodyBag.filter((g) => g.freebie).length;
if (freebies !== 1) problems.push(`${freebies} freebie items, expected exactly 1`);

if (a.wavetops.length !== b.wavetops.length) {
  problems.push(`wavetops went from ${a.wavetops.length} to ${b.wavetops.length}`);
}

// hard copy rules the reviewers are not allowed to talk us out of
const strings = JSON.stringify(b);
if (strings.includes('—')) problems.push('em dash reintroduced');
if (/vibe cod/i.test(strings)) problems.push('"vibe coding" reintroduced');

const head = String(b.archiveHeadline || '');
if (head.length > 200) problems.push(`archiveHeadline is ${head.length} chars, expected under 160`);
for (const [i, w] of b.wavetops.entries()) {
  for (const f of ['headline', 'teaser', 'memberDetail']) {
    if (!String(w[f] || '').trim()) problems.push(`wavetops[${i}].${f} came back empty`);
  }
  if (/https?:\/\//.test(`${w.headline} ${w.teaser}`)) problems.push(`wavetops[${i}] has a link in a public field`);
}

if (problems.length) {
  console.error('✗ revision failed verification:');
  for (const p of problems) console.error(`   - ${p}`);
  process.exit(1);
}
console.log('✓ revision verified: links, stats, and week untouched');
