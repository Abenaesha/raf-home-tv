#!/bin/sh
# Installs release/raf-home.wgt on the TV with the Apps2Samsung CLI, then opens it.
# Usage: sh scripts/deploy.sh            (TV at 192.168.1.102)
#        RAF_TV_IP=192.168.1.50 sh scripts/deploy.sh
# Needs the CLI in .tools/ (sh scripts/setup-cli.sh) and Developer Mode on the TV pointing at
# this Mac. It reuses the signing certificate made by the Apps2Samsung desktop app.
set -u
cd "$(dirname "$0")/.."

TV="${RAF_TV_IP:-192.168.1.102}"
CLI=.tools/apps2samsung-cli
WGT=release/raf-home.wgt

if [ ! -x "$CLI" ]; then
    echo "raf-home: Apps2Samsung CLI missing. Run: sh scripts/setup-cli.sh"
    exit 1
fi
if [ ! -f "$WGT" ]; then
    echo "raf-home: $WGT not found. Run: npm run release"
    exit 1
fi

# The TV's debug port (26101) only answers with Developer Mode on; check it before the CLI spends
# time on a TV that is off or asleep.
if ! nc -z -G 3 "$TV" 26101 >/dev/null 2>&1; then
    echo "raf-home: TV at $TV is not reachable on port 26101 (off, asleep, Developer Mode off, or a new IP)."
    echo "          Turn it on and run: npm run deploy"
    exit 1
fi

# RAF_ALLOW_REMOVE=1 lets the CLI uninstall the TV's copy first when only that works, e.g. when
# the installed copy was signed by a different certificate. It erases Raf Home's settings on the TV.
EXTRA=""
[ -n "${RAF_ALLOW_REMOVE:-}" ] && EXTRA="--allow-remove"

echo "raf-home: installing $WGT on the TV at $TV..."
LOG=$(mktemp)
# Show progress live and keep a copy; the exit status is saved separately because a pipe hides it.
{ "$CLI" install "$WGT" --tv "$TV" --launch -q $EXTRA; echo $? > "$LOG.code"; } 2>&1 | tee "$LOG"
code=$(cat "$LOG.code" 2>/dev/null || echo 1)

if [ "$code" = 0 ]; then
    echo "raf-home: installed and opened on the TV."
elif grep -qi "allow-remove" "$LOG"; then
    echo "raf-home: the TV's copy was signed with a different certificate, so it must be removed first."
    echo "          That erases Raf Home's settings on the TV (not other apps). To go ahead, run:"
    echo "          RAF_ALLOW_REMOVE=1 npm run deploy"
elif [ "$code" = 3 ]; then
    echo "raf-home: the CLI stopped at a pre-install check (see above). If it is a false alarm, run:"
    echo "          $CLI install $WGT --tv $TV --launch --yes"
else
    echo "raf-home: install failed (exit $code, see above)."
fi
rm -f "$LOG" "$LOG.code"
exit "$code"
