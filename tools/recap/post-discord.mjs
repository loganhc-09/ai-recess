#!/usr/bin/env node
// Post the member recap into Discord via webhook, chunked under the 2000-char limit.
// Usage: node post-discord.mjs member-recap-2026-07-19.md   (env: DISCORD_WEBHOOK_URL)

import { readFile } from 'node:fs/promises';

const url = process.env.DISCORD_WEBHOOK_URL;
const file = process.argv[2];
if (!url || !file) { console.error('Need DISCORD_WEBHOOK_URL env and a markdown file arg'); process.exit(1); }

const md = await readFile(file, 'utf8');
const MAX = 1900;
const chunks = [];
let cur = '';
for (const raw of md.split('\n')) {
  // the goody bag is a reference list, not part of the skim: always start it on its own
  // message so the recap reads as one clean post instead of spilling links into it
  if (raw.startsWith('## Goody bag') && cur.trim()) { chunks.push(cur); cur = ''; }
  // a single line can exceed Discord's limit (memberDetail is one line); hard-split it
  const parts = raw.length > MAX ? raw.match(new RegExp(`.{1,${MAX}}`, 'gs')) : [raw];
  for (const line of parts) {
    if (cur && cur.length + line.length + 1 > MAX) { chunks.push(cur); cur = ''; }
    cur += (cur ? '\n' : '') + line;
  }
}
if (cur.trim()) chunks.push(cur);

for (const [i, content] of chunks.entries()) {
  const res = await fetch(`${url}?wait=true`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // member-derived text must never ping; suppress @everyone/@here/role/user mentions.
    // flags 4 = SUPPRESS_EMBEDS: a goody bag of 10+ links would otherwise unroll into
    // a wall of link previews. Links stay clickable, they just do not expand.
    body: JSON.stringify({ content, allowed_mentions: { parse: [] }, flags: 4 }),
  });
  if (!res.ok) {
    console.error(`Webhook failed on chunk ${i + 1}/${chunks.length}: ${res.status} ${await res.text()}`);
    console.error('Earlier chunks already posted; resume manually from that chunk.');
    process.exit(1);
  }
  await new Promise((r) => setTimeout(r, 600));
}
console.log(`✓ posted ${chunks.length} message(s) to Discord`);
