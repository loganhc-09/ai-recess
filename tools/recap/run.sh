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

# This repo keeps accumulating a stale .git/index.lock with no git process behind it (the
# code-review-graph pre-commit and PostToolUse hooks are the likely source). Unattended that
# is fatal: the run dies at `git add` AFTER all four model calls are already spent, so the
# week is lost and nothing posts. No real git operation holds the index for ten minutes.
LOCK="../../.git/index.lock"
if [ -f "$LOCK" ] && [ -z "$(find "$LOCK" -mmin -10 2>/dev/null)" ]; then
  echo "⚠ removing stale .git/index.lock (untouched for 10+ minutes)"
  rm -f "$LOCK"
fi

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
WEEK_START="$START" WEEK_END="$END" node extract-json.mjs "$OUT/recap.raw" stats wavetops goodyBag > "$OUT/recap.json"

# nothing to publish is a real outcome (quiet week, dead bot token); never ship an empty report
node -e '
  const r = require("./'"$OUT"'/recap.json");
  if (!Number(r.stats.messages) || !r.wavetops.length) {
    console.error("⚠ recap has no messages or no wavetops; refusing to publish. Check the bot token and channel permissions.");
    process.exit(2);
  }
'

node render.mjs "$OUT/recap.json"

# --- review gates: two personas read the draft before anything is published or posted ---
# Each reads only what it would really see. Neither is told the other exists.
echo ""
# One flaky model response should not cost the week's post, so each reviewer gets a second
# try. If it still will not come back as JSON, we stop: an unread gate is not a passed gate.
review() {
  local persona="$1" draft="$2" name="$3" label="$4"
  for attempt in 1 2; do
    echo "Review gate: $label (attempt $attempt)"
    cat "$persona" "$draft" | claude -p --output-format text > "$OUT/$name.raw" || true
    if node extract-json.mjs "$OUT/$name.raw" verdict > "$OUT/$name.json" 2>/dev/null; then return 0; fi
    echo "  ⚠ $label did not return usable JSON"
  done
  echo "✗ $label failed twice. Refusing to publish past a gate that never ran."
  return 1
}

review personas/member-reviewer.md "$OUT/member-recap-$END.md" review-member "the busy member, reading the Discord draft"
review personas/skeptic-reviewer.md "$OUT/public-preview.md" review-skeptic "the skeptic, reading the public page"

set +e; node review-gate.mjs "$OUT"; GATE=$?; set -e
case "$GATE" in
  0) ;;  # both reviewers would ship the draft as written
  10)
    cat revise-prompt.md "$OUT/revise-input.md" | claude -p --output-format text > "$OUT/recap.revised.raw"
    WEEK_START="$START" WEEK_END="$END" node extract-json.mjs "$OUT/recap.revised.raw" stats wavetops goodyBag > "$OUT/recap.revised.json"
    # a revision that touched links or stats is worse than no revision: keep the draft the
    # reviewers already cleared rather than halting the whole week over an editing slip
    if node verify-revision.mjs "$OUT/recap.json" "$OUT/recap.revised.json"; then
      cp "$OUT/recap.json" "$OUT/recap.predraft.json"
      mv "$OUT/recap.revised.json" "$OUT/recap.json"
      node render.mjs "$OUT/recap.json"
      echo "✓ reviewer feedback applied and re-rendered"
    else
      echo "⚠ discarding the revision and shipping the pre-revision draft (see errors above)"
    fi
    ;;
  3) echo "Halted at the review gate. Nothing published, nothing posted."; exit 3 ;;
  *) echo "Review gate failed unexpectedly (exit $GATE)"; exit 1 ;;
esac

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
