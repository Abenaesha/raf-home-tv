#!/bin/sh
# Batch-removes the Samsung apps that keep re-downloading on a hard restart.
# It cannot stop them coming back (that needs root), but it turns wiping them into one command:
#     npm run debloat
# First time, see what is on the TV and grab the IDs:
#     npm run list-apps
# Needs the Apps2Samsung CLI (sh scripts/setup-cli.sh) and Developer Mode on, pointing at this Mac.
set -u
cd "$(dirname "$0")/.."
TV="${RAF_TV_IP:-192.168.1.102}"
CLI=.tools/apps2samsung-cli
LIST=scripts/bloat-list.txt
[ -x "$CLI" ] || { echo "raf-home: CLI missing. Run: sh scripts/setup-cli.sh"; exit 1; }

if ! nc -z -G 3 "$TV" 26101 >/dev/null 2>&1; then
    echo "raf-home: TV at $TV not reachable on 26101 (off, asleep, Developer Mode off, or a new IP)."
    exit 1
fi

# npm run list-apps -> just show what is installed, with IDs, so you can fill bloat-list.txt.
if [ "${1:-}" = "--list" ]; then
    echo "raf-home: apps installed on the TV at $TV"
    echo "          (nothing is changed; copy the IDs you want gone into $LIST)"
    echo
    if "$CLI" installed --tv "$TV" --json > /tmp/raf-installed.json 2>/dev/null && [ -s /tmp/raf-installed.json ]; then
        if command -v jq >/dev/null 2>&1; then
            jq -r '.[] | "  \(.id)\t\(.name // .label // "")"' /tmp/raf-installed.json 2>/dev/null || cat /tmp/raf-installed.json
        else
            cat /tmp/raf-installed.json
        fi
    else
        "$CLI" installed --tv "$TV"
    fi
    echo
    echo "Then:  npm run debloat"
    exit 0
fi

[ -f "$LIST" ] || { echo "raf-home: $LIST not found."; exit 1; }

have=$(grep -v '^[[:space:]]*#' "$LIST" | sed 's/#.*//' | tr -d '[:space:]' | grep -c .)
if [ "$have" = 0 ]; then
    echo "raf-home: $LIST has no app IDs yet."
    echo "          Run 'npm run list-apps', put the IDs you want removed in that file, then run this again."
    exit 0
fi

removed=0; gone=0; kept=0
while IFS= read -r line; do
    id=$(printf '%s' "$line" | sed 's/#.*//' | tr -d '[:space:]')
    [ -n "$id" ] || continue
    printf 'raf-home: removing %-28s ... ' "$id"
    out=$("$CLI" uninstall "$id" --tv "$TV" 2>&1)
    if [ $? -eq 0 ]; then
        echo "done"; removed=$((removed+1))
    elif printf '%s' "$out" | grep -qi 'not installed\|no such\|not found\|does not exist'; then
        echo "not there"; gone=$((gone+1))
    elif printf '%s' "$out" | grep -qi "Apps settings\|preinstalled\|store and preinstalled"; then
        echo "Samsung app - can only be removed in the TV's Apps menu"; kept=$((kept+1))
    else
        echo "kept (protected or in use)"; kept=$((kept+1))
    fi
done < "$LIST"

echo
echo "raf-home: removed $removed, already gone $gone, kept $kept."
[ "$removed" -gt 0 ] && echo "          If they come back after a hard restart, just run: npm run debloat"
exit 0
