#!/usr/bin/env python3
"""
AI Recess — GA4 website analytics (the REAL traffic for joinairecess.com).

This is the counterpart to report.py (which only sees GitHub repo activity).
GA4 measurement ID on the site: G-8CQ7JES2VT.

Two modes:

  1. CSV mode (works today, no credentials):
       python3 analytics/ga4_report.py --csv ~/Downloads/Reports_snapshot.csv
     Parses a manual "Reports snapshot" export from the GA4 UI
     (Reports > Snapshot > share/download). Use this for an instant read.

  2. API mode (automatable, needs one-time setup):
       python3 analytics/ga4_report.py --period 28d
     Pulls live via the GA4 Data API. Requires:
       pip install google-analytics-data
       a Google service-account JSON with the Analytics Data API enabled,
       and that service account granted Viewer on the GA4 property.
     Configure via env:
       GA4_PROPERTY_ID=<numeric property id, e.g. 480000000>
       GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
     (Find the numeric Property ID in GA4: Admin > Property > Property details.
      It is NOT the G-XXXX measurement ID.)

Snapshots append to a local CSV for trend tracking.
"""

import argparse
import csv
import datetime
import os
import sys
from pathlib import Path

REPORT_DIR = Path(__file__).parent / "reports"
HISTORY_FILE = REPORT_DIR / "ga4_history.csv"
MEASUREMENT_ID = "G-8CQ7JES2VT"


# ---------------------------------------------------------------------------
# CSV mode — parse a manual GA4 "Reports snapshot" export
# ---------------------------------------------------------------------------

def parse_snapshot(path):
    """Parse the GA4 snapshot CSV into a list of (title, header, rows) blocks.

    The export is several mini-tables separated by blank lines. Comment lines
    start with '#'. The first non-comment line of each block is the header row;
    the rest are data rows.
    """
    blocks = []
    cur_comments, cur_header, cur_rows = [], None, []

    def flush():
        if cur_header or cur_rows:
            title = ""
            for c in cur_comments:
                t = c.lstrip("#").strip()
                if t and not t.startswith(("Start date", "End date", "----")):
                    title = t
                    break
            blocks.append((title, cur_header, list(cur_rows)))

    with open(os.path.expanduser(path)) as f:
        for raw in f:
            line = raw.rstrip("\n")
            if not line.strip():
                flush()
                cur_comments, cur_header, cur_rows = [], None, []
                continue
            if line.lstrip().startswith("#"):
                cur_comments.append(line)
                continue
            parts = next(csv.reader([line]))
            if cur_header is None:
                cur_header = parts
            else:
                cur_rows.append(parts)
    flush()
    return blocks


def _find(blocks, header_contains):
    for title, header, rows in blocks:
        if header and any(header_contains.lower() in h.lower() for h in header):
            return title, header, rows
    return None, None, None


def report_from_csv(path):
    blocks = parse_snapshot(path)

    print("=" * 56)
    print("  AI Recess — GA4 website analytics (joinairecess.com)")
    print(f"  Source: snapshot export  {os.path.basename(path)}")
    print(f"  Measurement ID: {MEASUREMENT_ID}")
    print("=" * 56)

    # Weekly active / new users
    _, ah, arows = _find(blocks, "Active users")
    _, _, nrows = _find(blocks, "New users")
    if arows:
        actives = [int(r[1]) for r in arows if len(r) > 1 and r[1].isdigit()]
        if actives:
            print(f"\n📈 Weekly active users: {actives}")
            print(f"   Latest: {actives[-1]}   Peak: {max(actives)}   Total span: {sum(actives)}")
            if len(actives) >= 2 and actives[-2]:
                print(f"   WoW change: {actives[-1] / actives[-2]:.1f}x")
    if nrows:
        new = [int(r[1]) for r in nrows if len(r) > 1 and r[1].isdigit()]
        if new:
            print(f"   New users (sum): {sum(new)}")

    # Acquisition channels (new users)
    _, _, crows = _find(blocks, "primary channel group")
    if crows:
        print(f"\n🔗 Acquisition (new users by channel)")
        total = sum(int(r[1]) for r in crows if len(r) > 1 and r[1].isdigit())
        for r in crows:
            if len(r) > 1 and r[1].isdigit():
                share = f"{100*int(r[1])/total:.0f}%" if total else "-"
                print(f"   {r[0]:<18} {int(r[1]):>5}  ({share})")
        direct = next((int(r[1]) for r in crows if r[0].lower() == "direct"), 0)
        if total and direct / total > 0.7:
            print(f"   ⚠️  {100*direct/total:.0f}% Direct — likely untagged TikTok/dark-social. Use ?ref= links.")

    # Top pages
    _, _, prows = _find(blocks, "Views")
    if prows:
        print(f"\n📄 Top pages (views)")
        for r in prows[:8]:
            if len(r) > 1 and r[1].isdigit():
                print(f"   {int(r[1]):>5}  {r[0][:60]}")

    # Events — the conversion-visibility check
    _, _, erows = _find(blocks, "Event count")
    if erows:
        events = {r[0]: int(r[1]) for r in erows if len(r) > 1 and r[1].isdigit()}
        print(f"\n🎯 Events")
        for name, count in events.items():
            print(f"   {name:<18} {count:>5}")
        if "join_click" not in events:
            print("   ⚠️  No `join_click` event yet. Deploy tracker.js, then mark")
            print("       join_click as a Key Event in GA4 to track conversions.")

    # Geography — pick the named-Country block and rank by users desc
    geo = []
    for title, header, rows in blocks:
        if header and header[0].strip().lower() == "country":
            geo = rows
            break
    if not geo:
        _, _, geo = _find(blocks, "Country")
    if geo:
        top = sorted(
            [(r[0], int(r[1])) for r in geo if len(r) > 1 and r[1].isdigit()],
            key=lambda x: -x[1],
        )[:6]
        if top:
            print("\n🌍 Top countries: " + ", ".join(f"{c} {n}" for c, n in top))

    _snapshot_history({
        "date": datetime.date.today().isoformat(),
        "source": "csv",
        "active_latest": actives[-1] if arows and actives else "",
        "new_users_sum": sum(new) if nrows and new else "",
    })
    print("\n" + "=" * 56)


# ---------------------------------------------------------------------------
# API mode — live pull via GA4 Data API
# ---------------------------------------------------------------------------

def report_from_api(period):
    try:
        from google.analytics.data_v1beta import BetaAnalyticsDataClient
        from google.analytics.data_v1beta.types import (
            DateRange, Dimension, Metric, RunReportRequest,
        )
    except ImportError:
        print("Error: GA4 Data API client not installed.", file=sys.stderr)
        print("  Run: pip install google-analytics-data", file=sys.stderr)
        print("  Or use CSV mode:  --csv ~/Downloads/Reports_snapshot.csv", file=sys.stderr)
        sys.exit(1)

    prop = os.environ.get("GA4_PROPERTY_ID")
    if not prop:
        print("Error: set GA4_PROPERTY_ID (numeric property id from GA4 Admin).", file=sys.stderr)
        print("  Also set GOOGLE_APPLICATION_CREDENTIALS to a service-account JSON", file=sys.stderr)
        print("  that has Viewer access on the property.", file=sys.stderr)
        sys.exit(1)

    days = period.rstrip("d") if period.endswith("d") else period
    client = BetaAnalyticsDataClient()

    def run(dims, metrics, limit=10):
        req = RunReportRequest(
            property=f"properties/{prop}",
            date_ranges=[DateRange(start_date=f"{days}daysAgo", end_date="today")],
            dimensions=[Dimension(name=d) for d in dims],
            metrics=[Metric(name=m) for m in metrics],
            limit=limit,
        )
        return client.run_report(req)

    print("=" * 56)
    print("  AI Recess — GA4 website analytics (joinairecess.com)")
    print(f"  Source: GA4 Data API   property {prop}   last {days}d")
    print("=" * 56)

    totals = run([], ["activeUsers", "newUsers", "sessions", "screenPageViews",
                      "averageSessionDuration"])
    if totals.rows:
        v = totals.rows[0].metric_values
        print(f"\n📈 Active: {v[0].value}  New: {v[1].value}  "
              f"Sessions: {v[2].value}  Views: {v[3].value}  "
              f"AvgSession: {float(v[4].value):.0f}s")

    chans = run(["sessionDefaultChannelGroup"], ["sessions"])
    print(f"\n🔗 Sessions by channel")
    for row in chans.rows:
        print(f"   {row.dimension_values[0].value:<18} {row.metric_values[0].value:>6}")

    pages = run(["pageTitle"], ["screenPageViews"])
    print(f"\n📄 Top pages")
    for row in pages.rows[:8]:
        print(f"   {row.metric_values[0].value:>6}  {row.dimension_values[0].value[:55]}")

    events = run(["eventName"], ["eventCount"], limit=25)
    names = {row.dimension_values[0].value: row.metric_values[0].value for row in events.rows}
    print(f"\n🎯 Events")
    for n, c in names.items():
        print(f"   {n:<20} {c:>6}")
    if "join_click" not in names:
        print("   ⚠️  No join_click yet — deploy tracker.js + mark it a Key Event.")

    _snapshot_history({
        "date": datetime.date.today().isoformat(),
        "source": f"api-{days}d",
        "active_latest": totals.rows[0].metric_values[0].value if totals.rows else "",
        "new_users_sum": totals.rows[0].metric_values[1].value if totals.rows else "",
    })
    print("\n" + "=" * 56)


def _snapshot_history(row):
    REPORT_DIR.mkdir(exist_ok=True)
    write_header = not HISTORY_FILE.exists()
    with open(HISTORY_FILE, "a", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["date", "source", "active_latest", "new_users_sum"])
        if write_header:
            w.writeheader()
        w.writerow(row)


def main():
    ap = argparse.ArgumentParser(description="GA4 website analytics for joinairecess.com")
    ap.add_argument("--csv", help="Parse a manual GA4 'Reports snapshot' export")
    ap.add_argument("--period", default="28d", help="API mode lookback, e.g. 7d / 28d / 90d")
    args = ap.parse_args()

    if args.csv:
        report_from_csv(args.csv)
    else:
        report_from_api(args.period)


if __name__ == "__main__":
    main()
