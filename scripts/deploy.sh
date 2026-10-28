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

echo "raf-home: installing $WGT on the TV at $TV..."
"$CLI" install "$WGT" --tv "$TV" --launch -q
code=$?
case $code in
    0) echo "raf-home: installed and opened on the TV." ;;
    3) echo "raf-home: the CLI stopped at a pre-install check (see above). If it is a false alarm, run:"
       echo "          $CLI install $WGT --tv $TV --launch --yes" ;;
    *) echo "raf-home: install failed (exit $code)." ;;
esac
exit $code
