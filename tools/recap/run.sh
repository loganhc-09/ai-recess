#!/bin/bash
# Weekly Recess Report pipeline: export → digest → render → push the site → post to Discord.
# Runs unattended from launchd (com.airecess.recap, Sundays 22:00 local).
#   --dry-run   build and render everything, but do not commit, push, or post.
set -euo pipefail
cd "$(dirname "$0")"

DRY_RUN=0
[ "${1:-}" = "--dry-run" ] && DRY_RUN=1

# launchd agents get a bare PATH; node, claude, and git live in Homebrew / ~/.local
export PATH="/opt/homebrew/bin:/usr/local/bin:$HOME/.local/bin:$PATH"

ENV_FILE="$HOME/.config/ai-recess-recap/.env"
[ -f "$ENV_FILE" ] || { echo "Missing $ENV_FILE (needs DISCORD_BOT_TOKEN, GUILD_ID, DISCORD_WEBHOOK_URL)"; exit 1; }
set -a; source "$ENV_FILE"; set +a

echo "=== Recess Report run: $(date) ==="

# Week window: the most recent COMPLETED Sunday 21:00 ET cut, back one week.
# Running on a Sunday before 21:00 uses last week's window instead of ending in the future.
read -r AFTER BEFORE START END <<< "$(node -e '
  const tz = "America/New_York";
  const ymd = (x) => new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(x);
  const weekday = (x) => new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short" }).format(x);
  // ET offset for a given date, so the cut stays 21:00 ET across the DST boundary
  const offset = (d) => {
    const s = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "shortOffset" }).format(d);
    const m = s.match(/GMT([+-]\d+)/);
    const h = m ? Number(m[1]) : -5;
    return `${h < 0 ? "-" : "+"}${String(Math.abs(h)).padStart(2, "0")}:00`;
  };
  const now = new Date();
  const d = new Date(now);
  while (weekday(d) !== "Sun") d.setDate(d.getDate() - 1);
  if (new Date(`${ymd(d)}T21:00:00${offset(d)}`) > now) d.setDate(d.getDate() - 7);
  const end = ymd(d);
  const s = new Date(d); s.setDate(s.getDate() - 7);
  const start = ymd(s);
  console.log(`${start}T21:00:00${offset(s)} ${end}T21:00:00${offset(d)} ${start} ${end}`);
')"

OUT="exports/$END"
echo "Recess Report window: $AFTER → $BEFORE"

# three people push to this repo; never build a page on top of a stale tree
git -C ../.. pull --rebase --autostash

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

# nothing to publish is a real outcome (quiet week, dead bot token); never ship an empty report
node -e '
  const r = require("./'"$OUT"'/recap.json");
  if (!Number(r.stats.messages) || !r.wavetops.length) {
    console.error("⚠ recap has no messages or no wavetops; refusing to publish. Check the bot token and channel permissions.");
    process.exit(2);
  }
'

node render.mjs "$OUT/recap.json"

if [ "$DRY_RUN" = "1" ]; then
  echo ""
  echo "DRY RUN: nothing committed, pushed, or posted."
  echo "  page   → recess-report/$END/index.html"
  echo "  member → tools/recap/$OUT/member-recap-$END.md"
  echo "  ship it → tools/recap/run.sh (reruns the week and publishes)"
  exit 0
fi

# --- ship: site first, so the link in the Discord post resolves ---
cd ../..
# scoped adds only: tools/recap/exports/ holds raw member messages (gitignored, but never risk 'git add -A' here)
git add "recess-report/$END" recess-report/index.html recess-report/issues.json index.html sitemap.xml
if git diff --cached --quiet; then
  echo "No site changes to commit (already published?)"
else
  git commit -m "feat: recess report $END"
  git push origin main
  echo "✓ pushed to origin/main"
fi
cd tools/recap

# GitHub Pages takes a minute; the member recap links the public page, so wait for it
URL="https://joinairecess.com/recess-report/$END/"
for _ in $(seq 1 24); do
  [ "$(curl -s -o /dev/null -w '%{http_code}' "$URL")" = "200" ] && { echo "✓ live: $URL"; break; }
  sleep 15
done

# --- post to Discord, once ---
if [ -f "$OUT/.posted" ]; then
  echo "Already posted to Discord for $END; skipping."
else
  node post-discord.mjs "$OUT/member-recap-$END.md"
  touch "$OUT/.posted"
fi

echo "=== done: $(date) ==="
