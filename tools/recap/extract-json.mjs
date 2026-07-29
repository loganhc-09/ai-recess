#!/usr/bin/env node
// Pull the JSON object out of a `claude -p` response and prove it is the shape we expected.
// Used for the digest, both persona reviews, and the revision, so a model that answers with
// prose or a truncated object fails loudly here instead of silently publishing garbage.
//
// Usage: node extract-json.mjs <file> [requiredKey ...]
//   env WEEK_START / WEEK_END: if set, stamps j.week (the digest does not know the window)

import { readFile } from 'node:fs/promises';

const [file, ...required] = process.argv.slice(2);
if (!file) { console.error('Usage: node extract-json.mjs <file> [requiredKey ...]'); process.exit(1); }

const s = await readFile(file, 'utf8');
const a = s.indexOf('{'), b = s.lastIndexOf('}');
if (a < 0 || b < 0) { console.error(`No JSON object in ${file}; inspect it by hand`); process.exit(1); }

let j;
try {
  j = JSON.parse(s.slice(a, b + 1));
} catch (e) {
  console.error(`${file} contains a JSON object that will not parse: ${e.message}`);
  process.exit(1);
}

for (const k of required) {
  const v = j[k];
  const empty = v === undefined || v === null || (Array.isArray(v) && !v.length);
  if (empty) { console.error(`${file} parsed but is missing "${k}"; inspect it by hand`); process.exit(1); }
}

if (process.env.WEEK_START && process.env.WEEK_END) {
  j.week = { ...j.week, start: process.env.WEEK_START, end: process.env.WEEK_END };
}

console.log(JSON.stringify(j, null, 2));
