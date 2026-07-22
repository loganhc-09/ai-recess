#!/bin/bash
# Weekly Recess Report pipeline: export → digest → render → open for review.
# Does NOT push or post. A human approves, then: git add (scoped!) + push, then node post-discord.mjs <member-recap.md>
set -euo pipefail
cd "$(dirname "$0")"

# launchd agents get a bare PATH; node and claude live in Homebrew / ~/.local
export PATH="/opt/homebrew/bin:/usr/local/bin:$HOME/.local/bin:$PATH"

ENV_FILE="$HOME/.config/ai-recess-recap/.env"
[ -f "$ENV_FILE" ] || { echo "Missing $ENV_FILE (needs DISCORD_BOT_TOKEN, GUILD_ID, DISCORD_WEBHOOK_URL)"; exit 1; }
set -a; source "$ENV_FILE"; set +a

# Week window: the most recent COMPLETED Sunday 21:00 ET cut, back one week.
# Running on a Sunday before 21:00 uses last week's window instead of ending in the future.
read -r AFTER BEFORE START END <<< "$(node -e '
  const tz = "America/New_York";
  const ymd = (x) => new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(x);
  const weekday = (x) => new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short" }).format(x);
  const now = new Date();
  const d = new Date(now);
  while (weekday(d) !== "Sun") d.setDate(d.getDate() - 1);
  if (new Date(`${ymd(d)}T21:00:00-04:00`) > now) d.setDate(d.getDate() - 7);
  const end = ymd(d);
  const s = new Date(d); s.setDate(s.getDate() - 7);
  const start = ymd(s);
  console.log(`${start}T21:00:00-04:00 ${end}T21:00:00-04:00 ${start} ${end}`);
')"

OUT="exports/$END"
echo "Recess Report window: $AFTER → $BEFORE"

node export.mjs --after "$AFTER" --before "$BEFORE" --out "$OUT"

# a channel that failed to export means the digest would run on partial data; say so loudly
node -e '
  const m = require("./'"$OUT"'/manifest.json");
  const failed = m.channels.filter((c) => c.error);
  if (failed.length) {
    console.error(`⚠ ${failed.length} channel(s) failed to export: ${failed.map((c) => "#" + c.name).join(", ")}`);
    console.error("The recap will be built from PARTIAL data. Fix permissions and rerun if these channels matter.");
  }
'

node compact.mjs "$OUT" > "$OUT/transcript.md"

cat digest-prompt.md "$OUT/transcript.md" | claude -p --output-format text > "$OUT/recap.raw"
START="$START" END="$END" node -e '
  const { readFileSync } = require("fs");
  const s = readFileSync(process.argv[1], "utf8");
  const a = s.indexOf("{"), b = s.lastIndexOf("}");
  if (a < 0 || b < 0) throw new Error(`No JSON object in recap.raw; inspect ${process.argv[1]}`);
  const j = JSON.parse(s.slice(a, b + 1));
  if (!j.stats || !Array.isArray(j.wavetops) || !Array.isArray(j.goodyBag))
    throw new Error(`recap.raw parsed but is not a recap (missing stats/wavetops/goodyBag); inspect ${process.argv[1]}`);
  j.week = { ...j.week, start: process.env.START, end: process.env.END };
  console.log(JSON.stringify(j, null, 2));
' "$OUT/recap.raw" > "$OUT/recap.json"

node render.mjs "$OUT/recap.json"

open "../../recess-report/$END/index.html" 2>/dev/null || true
open "$OUT/member-recap-$END.md" 2>/dev/null || true
echo ""
echo "REVIEW, then to ship:"
echo "  1. add /recess-report/$END/ to sitemap.xml"
echo "  2. git add recess-report/$END sitemap.xml && git commit -m 'feat: recess report $END' && git push"
echo "     (never 'git add -A' here: tools/recap/exports/ holds raw member messages, gitignored)"
echo "  3. node tools/recap/post-discord.mjs tools/recap/$OUT/member-recap-$END.md"
