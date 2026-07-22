#!/usr/bin/env node
// Export a week of AI Recess Discord messages to JSON via the REST API.
// Usage: node export.mjs --after 2026-07-12T21:00:00-04:00 --before 2026-07-19T21:00:00-04:00 --out exports/2026-07-19
// Env (from ~/.config/ai-recess-recap/.env): DISCORD_BOT_TOKEN, GUILD_ID

import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const args = Object.fromEntries(
  process.argv.slice(2).map((a, i, arr) => (a.startsWith('--') ? [a.slice(2), arr[i + 1]] : null)).filter(Boolean)
);
const { DISCORD_BOT_TOKEN: TOKEN, GUILD_ID } = process.env;
if (!TOKEN || !GUILD_ID) { console.error('Missing DISCORD_BOT_TOKEN or GUILD_ID'); process.exit(1); }
if (!args.after || !args.before || !args.out) { console.error('Need --after, --before, --out'); process.exit(1); }

const API = 'https://discord.com/api/v10';
const DISCORD_EPOCH = 1420070400000n;
// Discord pagination cursors must be snowflakes, never ISO timestamps.
const toSnowflake = (iso) => ((BigInt(new Date(iso).getTime()) - DISCORD_EPOCH) << 22n).toString();
const fromSnowflake = (id) => new Date(Number((BigInt(id) >> 22n) + DISCORD_EPOCH));

async function api(path) {
  for (;;) {
    const res = await fetch(`${API}${path}`, { headers: { Authorization: `Bot ${TOKEN}` } });
    if (res.status === 429) {
      const body = await res.json();
      await new Promise((r) => setTimeout(r, (body.retry_after ?? 1) * 1000 + 100));
      continue;
    }
    if (!res.ok) throw new Error(`${res.status} ${res.statusText} on ${path}: ${await res.text()}`);
    return res.json();
  }
}

function slim(m) {
  return {
    id: m.id,
    ts: m.timestamp,
    author: m.author?.global_name || m.author?.username || 'unknown',
    bot: !!m.author?.bot,
    content: m.content,
    attachments: (m.attachments ?? []).map((a) => ({ name: a.filename, url: a.url })),
    embeds: (m.embeds ?? []).map((e) => ({ title: e.title, url: e.url })).filter((e) => e.title || e.url),
    reactions: (m.reactions ?? []).reduce((n, r) => n + r.count, 0),
    replyTo: m.message_reference?.message_id ?? null,
  };
}

async function exportChannel(ch, afterSnowflake, beforeMs) {
  const messages = [];
  let cursor = afterSnowflake;
  for (;;) {
    const page = await api(`/channels/${ch.id}/messages?after=${cursor}&limit=100`);
    if (!page.length) break;
    page.sort((a, b) => (BigInt(a.id) < BigInt(b.id) ? -1 : 1));
    for (const m of page) {
      if (fromSnowflake(m.id).getTime() >= beforeMs) return messages;
      messages.push(slim(m));
    }
    cursor = page[page.length - 1].id;
    await new Promise((r) => setTimeout(r, 350));
  }
  return messages;
}

const after = toSnowflake(args.after);
const beforeMs = new Date(args.before).getTime();
await mkdir(args.out, { recursive: true });

// EXCLUDE_CHANNELS: comma-separated channel names that never feed the recap (founder/internal rooms)
const excluded = new Set((process.env.EXCLUDE_CHANNELS ?? '').split(',').map((s) => s.trim()).filter(Boolean));
const channels = await api(`/guilds/${GUILD_ID}/channels`);
const readable = channels.filter((c) => [0, 5].includes(c.type) && !excluded.has(c.name)); // text + announcement
const excludedIds = new Set(channels.filter((c) => excluded.has(c.name)).map((c) => c.id));
const active = await api(`/guilds/${GUILD_ID}/threads/active`).catch(() => ({ threads: [] }));
const threads = active.threads.filter((t) => !excludedIds.has(t.parent_id));
const targets = [...readable, ...threads.map((t) => ({ ...t, name: `thread:${t.name}` }))];

const manifest = { after: args.after, before: args.before, exportedAt: new Date().toISOString(), channels: [] };
for (const ch of targets) {
  try {
    const messages = await exportChannel(ch, after, beforeMs);
    const file = `${ch.name.replace(/[^a-z0-9_-]/gi, '_')}.json`;
    await writeFile(join(args.out, file), JSON.stringify({ channel: ch.name, id: ch.id, messages }, null, 1));
    manifest.channels.push({ name: ch.name, id: ch.id, file, count: messages.length });
    console.log(`✓ #${ch.name}: ${messages.length} messages`);
  } catch (e) {
    console.error(`✗ #${ch.name}: ${e.message}`); // e.g. missing permissions; skip and continue
    manifest.channels.push({ name: ch.name, id: ch.id, error: e.message });
  }
}
await writeFile(join(args.out, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log(`Exported ${manifest.channels.reduce((n, c) => n + (c.count ?? 0), 0)} messages to ${args.out}`);
