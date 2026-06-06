#!/usr/bin/env python3
"""
AI Recess — GitHub REPO activity report  (NOT website traffic)

⚠️ READ THIS FIRST. This pulls the GitHub *repository* Traffic API, which
counts views of the repo page on github.com (/pulls, /branches, /forks) —
i.e. developer activity on the source, NOT visits to the live site at
joinairecess.com. Treat the numbers here as "is anyone looking at the repo,"
not as marketing analytics.

>>> Real website traffic lives in Google Analytics 4, property G-8CQ7JES2VT.
    See it at analytics.google.com, or wire the GA4 Data API for a CLI pull
    (parallel to ~/Scripts/plausible.py for logancurrie.com).

What this script reports (repo-scoped, last 14 days rolling):
- Repo page views and unique viewers
- Top referrers to the repo page
- Top repo paths viewed
- Repo clones

Run weekly: python3 analytics/report.py
Requires: GITHUB_TOKEN env var (or gh CLI auth)

The GitHub Traffic API gives 14 days of rolling data, so run this
at least every 2 weeks to avoid gaps. The script appends to a
local CSV for historical tracking.
"""

import json
import os
import subprocess
import sys
from datetime import datetime
from pathlib import Path

REPO = "loganhc-09/ai-recess"
REPORT_DIR = Path(__file__).parent / "reports"
HISTORY_FILE = REPORT_DIR / "traffic_history.csv"


def gh_api(endpoint):
    """Call GitHub API via gh CLI (uses existing auth)."""
    result = subprocess.run(
        ["gh", "api", f"repos/{REPO}/{endpoint}"],
        capture_output=True, text=True
    )
    if result.returncode != 0:
        print(f"  Error: {result.stderr.strip()}")
        return None
    return json.loads(result.stdout)


def run_report():
    REPORT_DIR.mkdir(exist_ok=True)

    print("=" * 50)
    print(f"  AI Recess — GitHub REPO activity (NOT site traffic)")
    print(f"  Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print(f"  Real site traffic: GA4 property G-8CQ7JES2VT")
    print("=" * 50)

    # --- Views ---
    views = gh_api("traffic/views")
    if views:
        print(f"\n📊 Repo page views (last 14 days) — github.com, not the live site")
        print(f"   Total repo views:    {views.get('count', 0)}")
        print(f"   Unique repo viewers: {views.get('uniques', 0)}")

        if views.get("views"):
            print(f"\n   Daily breakdown:")
            for day in views["views"][-7:]:  # Last 7 days
                date = day["timestamp"][:10]
                print(f"   {date}  {day['count']:>4} views  ({day['uniques']} unique)")

    # --- Referrers ---
    referrers = gh_api("traffic/popular/referrers")
    if referrers:
        print(f"\n🔗 Top Referrers")
        for ref in referrers[:10]:
            print(f"   {ref['referrer']:<30} {ref['count']:>4} views  ({ref['uniques']} unique)")

    # --- Popular content ---
    paths = gh_api("traffic/popular/paths")
    if paths:
        print(f"\n📄 Top Pages")
        for p in paths[:10]:
            print(f"   {p['path']:<40} {p['count']:>4} views  ({p['uniques']} unique)")

    # --- Clones (proxy for engagement) ---
    clones = gh_api("traffic/clones")
    if clones:
        print(f"\n📥 Repo Clones (last 14 days)")
        print(f"   Total: {clones.get('count', 0)}  Unique: {clones.get('uniques', 0)}")

    # --- Append to history CSV ---
    today = datetime.now().strftime("%Y-%m-%d")
    if views:
        write_header = not HISTORY_FILE.exists()
        with open(HISTORY_FILE, "a") as f:
            if write_header:
                f.write("date,views,uniques,top_referrer,top_referrer_views\n")
            top_ref = referrers[0]["referrer"] if referrers else "none"
            top_ref_views = referrers[0]["count"] if referrers else 0
            f.write(f"{today},{views['count']},{views['uniques']},{top_ref},{top_ref_views}\n")
        print(f"\n✅ Appended to {HISTORY_FILE}")

    # --- Attribution summary ---
    print(f"\n🎯 Attribution Links to Use (subtle ref codes)")
    print(f"   Logan:           joinairecess.com?ref=l")
    print(f"   Kevin:           joinairecess.com?ref=k")
    print(f"   V (Vanessa):     joinairecess.com?ref=v")
    print(f"   Specific video:  joinairecess.com?ref=l&utm_campaign=reading-scout")
    print(f"   (tracker.js reads any ?ref= value -> GA4 + LaunchPass)")

    print(f"\n{'=' * 50}")
    print(f"  Next: cross-reference with Skool payment emails")
    print(f"  to match signups to referral sources.")
    print(f"{'=' * 50}")


if __name__ == "__main__":
    run_report()
