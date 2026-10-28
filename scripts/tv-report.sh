#!/bin/sh
# Reads the TV's installed apps and basic state into tv-report/ so they can be reviewed.
# Nothing is changed on the TV. Needs the Apps2Samsung CLI (sh scripts/setup-cli.sh) and
# Developer Mode on, pointing at this Mac.
set -u
cd "$(dirname "$0")/.."
TV="${RAF_TV_IP:-192.168.1.102}"
CLI=.tools/apps2samsung-cli
[ -x "$CLI" ] || { echo "raf-home: CLI missing. Run: sh scripts/setup-cli.sh"; exit 1; }

mkdir -p tv-report
echo "raf-home: reading the TV at $TV (nothing is changed)..."
"$CLI" tv "$TV" > tv-report/tv.txt 2>&1 || true
"$CLI" installed --tv "$TV" --json > tv-report/installed.json 2>tv-report/installed.err || \
  "$CLI" installed --tv "$TV" > tv-report/installed.txt 2>>tv-report/installed.err || true
echo "raf-home: saved to tv-report/. Done."
ls -la tv-report
