# Recess Report pipeline

Weekly automation: export the week's AI Recess Discord messages, digest them with Claude, render a public teaser page (`/recess-report/<date>/`) and a full member recap that gets posted back into the Discord. Strategy doc: `../../.claude/GOAL-weekly-recap.md`.

## One-time setup

1. **Create the bot** (needs someone with Manage Server on the AI Recess Discord):
   - discord.com/developers/applications → New Application → "AI Recess Recap"
   - Bot tab → Reset Token → copy it. Enable the **Message Content Intent** (required to read message text).
   - OAuth2 → URL Generator → scope `bot`, permissions **View Channels + Read Message History** only. Open the generated URL, invite to the AI Recess server.
2. **Create a webhook** for the member recap: Discord → channel settings on `#weekly-recap` (or #announcements) → Integrations → Webhooks → New Webhook → copy URL.
3. **Get the guild ID**: Discord → Settings → Advanced → Developer Mode on → right-click server name → Copy Server ID.
4. **Store credentials** (never in this repo, it is public):
   ```bash
   mkdir -p ~/.config/ai-recess-recap
   cat > ~/.config/ai-recess-recap/.env <<'EOF'
   DISCORD_BOT_TOKEN=...
   GUILD_ID=...
   DISCORD_WEBHOOK_URL=...
   EXCLUDE_CHANNELS=founder-chat,content-pipeline,biz-ops
   EOF
   chmod 600 ~/.config/ai-recess-recap/.env
   ```
5. **Announce it in Discord** before the first issue: recaps are compiled weekly, member names and quotes only ever appear in the in-Discord edition, and anyone can opt out by reacting/DM.

## Weekly run (Sunday night, or Monday)

```bash
tools/recap/run.sh
```

Runs unattended from launchd every Sunday at 22:00 local and publishes itself. It exports the Sunday-21:00-ET-to-Sunday-21:00-ET window, digests, renders, sends the draft through two review gates, pushes the site, waits for Pages, and posts to Discord once.

`run.sh --dry-run` does everything except commit, push, and post. Use it to test changes.

Scoped `git add` only: `tools/recap/exports/` holds raw member messages. It is gitignored, but this repo is public, so **never `git add -A` here.**

```bash
cp tools/recap/com.airecess.recap.plist ~/Library/LaunchAgents/
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.airecess.recap.plist
```

Logs to `/tmp/airecess-recap.log`. If that file does not exist, the job has never fired.

## The review gates

Two personas read the draft before anything ships. Each is a headless `claude -p` call that sees only the artifact it would really encounter, and neither is told the other exists.

| Gate | Persona | Reads |
|---|---|---|
| 1 | A paying member who is short on time and skims on their phone | `member-recap-<date>.md`, the Discord post |
| 2 | A skeptic deciding whether $20/month is worth it | `public-preview.md`, the plain-text public page |

Each returns a verdict:

- **ship**: post as drafted, no revision pass.
- **revise**: the common case. Notes from both go into a single revision pass, which rewrites copy only and re-renders.
- **block**: nothing publishes, nothing posts, `run.sh` exits 3. Reserved for output that would cost trust, not for taste.

`verify-revision.mjs` guards the revision: goody bag URLs, stats, and the week must come back untouched, and the hard copy rules must hold. A revision that fails verification is discarded and the pre-revision draft ships, since that draft already cleared both gates. A reviewer that will not return usable JSON twice halts the run, because an unread gate is not a passed gate.

Reviewer reactions and notes are printed to the log every week, so the log is worth reading even when a run succeeds.

## Files

| File | Does |
|---|---|
| `export.mjs` | Pages `GET /channels/:id/messages` per channel + active threads with snowflake cursors (never ISO timestamps), writes JSON per channel |
| `compact.mjs` | Flattens exports into one token-lean transcript, drops bots and empty messages |
| `digest-prompt.md` | The `claude -p` prompt; outputs structured recap JSON with public/member field separation |
| `render.mjs` | recap.json → teaser HTML (redactions are real: locked content is absent from the DOM, not blurred), member markdown, `public-preview.md`, plus the archive index, `issues.json`, homepage strip, and sitemap |
| `personas/*.md` | The two review-gate personas. Each returns a verdict plus field-targeted notes |
| `revise-prompt.md` | Applies both reviewers' notes to recap.json. Rewrites copy only, never links or stats |
| `review-gate.mjs` | Reads both reviews, prints them, decides: 0 ship, 10 revise, 3 blocked |
| `verify-revision.mjs` | Proves the revision only touched copy. Failure discards the revision, keeps the draft |
| `extract-json.mjs` | Pulls the JSON out of any `claude -p` response and asserts required keys |
| `post-discord.mjs` | Webhook-posts the member recap, chunked under Discord's 2000-char limit, embeds suppressed |
| `run.sh` | Orchestrates the whole weekly run: export, digest, render, gate, revise, publish, post |

## Known limits (V1)

- Forum channels and archived threads are not exported yet, only text/announcement channels and active threads.
- Privacy rules live in `digest-prompt.md` and `revise-prompt.md` (public fields: no member names, no quotes, no links). `render.mjs` warns on a suspected leak. Nothing blocks on it, so the rules in those prompts are the real control.
- The `stats` numbers are written by the digest from the transcript, not computed. Spot-checked once at 24 links against 42 unique URLs actually posted, so treat the count as approximate. It renders on the public page.
- A channel that fails to export warns loudly and the run continues on partial data.
- Every run costs four `claude -p` calls: digest, two reviews, and the revision.
