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

Exports Sunday-21:00-ET-to-Sunday-21:00-ET, digests, renders, and opens both outputs for review. Nothing publishes without a human. To ship after review:

1. Add `/recess-report/<date>/` to `sitemap.xml`.
2. `git add recess-report/<date> sitemap.xml && git commit -m "feat: recess report <date>" && git push` (Pages deploys the teaser). **Never `git add -A` for this**: `tools/recap/exports/` holds raw member messages. It is gitignored, but stay scoped anyway — this repo is public.
3. `node tools/recap/post-discord.mjs tools/recap/exports/<date>/member-recap-<date>.md`

To schedule the draft step automatically, load `com.airecess.recap.plist` into launchd (runs Sunday 22:00 local; review still happens by hand):

```bash
cp tools/recap/com.airecess.recap.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.airecess.recap.plist
```

## Files

| File | Does |
|---|---|
| `export.mjs` | Pages `GET /channels/:id/messages` per channel + active threads with snowflake cursors (never ISO timestamps), writes JSON per channel |
| `compact.mjs` | Flattens exports into one token-lean transcript, drops bots and empty messages |
| `digest-prompt.md` | The `claude -p` prompt; outputs structured recap JSON with public/member field separation |
| `render.mjs` | recap.json → teaser HTML (redactions are real: locked content is absent from the DOM, not blurred) + member markdown |
| `post-discord.mjs` | Webhook-posts the member recap, chunked under Discord's 2000-char limit |
| `run.sh` | Orchestrates a weekly draft run end to end, then stops for human review |

## Known limits (V1)

- `run.sh` hardcodes `-04:00` (EDT) for the window boundary. In winter the cut drifts one hour. Harmless for a weekly recap; fix when it bothers someone.
- Forum channels and archived threads are not exported yet, only text/announcement channels and active threads.
- Privacy rules live in `digest-prompt.md` (public fields: no member names, no quotes, no links). The human review step is the backstop.
