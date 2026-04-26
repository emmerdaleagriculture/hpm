#!/usr/bin/env python3
"""
crawl-diff.py — diff two Screaming Frog HTML exports.

Compares a pre-launch baseline crawl with a post-launch crawl of the
HPM site and reports:
  * URLs that disappeared (must be redirected)
  * URLs that appeared (intentional new pages?)
  * URLs whose status code changed (was 200, now 404 etc.)

Filters to text/html responses only — ignores images, CSS, JS.

Usage:
    python3 scripts/crawl-diff.py baseline.csv postlaunch.csv \\
        > diff-report.txt
"""

import csv
import sys


def load_urls(path):
    """Load HTML URLs from a Screaming Frog CSV export, keyed by Address."""
    with open(path, encoding="utf-8-sig") as f:
        return {
            row["Address"]: row
            for row in csv.DictReader(f)
            if "text/html" in (row.get("Content Type") or "")
        }


def main(baseline_path, postlaunch_path):
    baseline = load_urls(baseline_path)
    postlaunch = load_urls(postlaunch_path)

    baseline_urls = set(baseline.keys())
    postlaunch_urls = set(postlaunch.keys())

    removed = baseline_urls - postlaunch_urls
    added = postlaunch_urls - baseline_urls
    common = baseline_urls & postlaunch_urls

    print(f"Baseline:   {len(baseline_urls)} HTML URLs")
    print(f"Postlaunch: {len(postlaunch_urls)} HTML URLs")
    print(f"Common:     {len(common)}")
    print(f"Removed:    {len(removed)}")
    print(f"Added:      {len(added)}")

    print("\n=== REMOVED URLs (must redirect) ===")
    for url in sorted(removed):
        status = baseline[url].get("Status Code", "?")
        title = (baseline[url].get("Title 1") or "")[:60]
        print(f"  [{status}] {url}")
        print(f"        was: {title}")

    print("\n=== ADDED URLs (new pages on rebuild) ===")
    for url in sorted(added):
        title = (postlaunch[url].get("Title 1") or "")[:60]
        print(f"  {url}")
        print(f"        title: {title}")

    print("\n=== STATUS CODE CHANGES on common URLs ===")
    for url in sorted(common):
        b_status = baseline[url].get("Status Code", "?")
        p_status = postlaunch[url].get("Status Code", "?")
        if b_status != p_status:
            print(f"  {url}")
            print(f"        was {b_status}, now {p_status}")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print(
            "Usage: python3 scripts/crawl-diff.py baseline.csv postlaunch.csv",
            file=sys.stderr,
        )
        sys.exit(2)
    main(sys.argv[1], sys.argv[2])
