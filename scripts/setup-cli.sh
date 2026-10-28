#!/bin/sh
# Downloads the Apps2Samsung CLI (v3.0.0, macOS arm64) into .tools/, checks its SHA-256 against
# the value published on the release page, records its help text in .tools/cli-help.txt, and
# enables the push hook that installs new builds on the TV.
set -eu
cd "$(dirname "$0")/.."
VERSION=v3.0.0
FILE=Apps2Samsung-cli-$VERSION-osx-arm64.tar.gz
SHA=e30551f1f884d4c866ef3c78a40e94634a3924da654d56a7fa631415a222c642

mkdir -p .tools
curl -fL -o ".tools/$FILE" "https://github.com/Apps2Samsung/Apps2Samsung/releases/download/$VERSION/$FILE"
GOT=$(shasum -a 256 ".tools/$FILE" | cut -d' ' -f1)
if [ "$GOT" != "$SHA" ]; then
    echo "Checksum mismatch: got $GOT, expected $SHA. Not unpacking." >&2
    rm -f ".tools/$FILE"
    exit 1
fi
echo "Checksum OK"
tar -xzf ".tools/$FILE" -C .tools
xattr -dr com.apple.quarantine .tools 2>/dev/null || true

CLI=$(find .tools -type f -perm -u+x -iname '*apps2samsung*' | head -n 1)
if [ -z "$CLI" ]; then
    echo "Unpacked, but no executable found. Contents:"; ls -laR .tools | head -40
    exit 1
fi
echo "CLI: $CLI"
{
    echo "== $CLI --help"; "$CLI" --help 2>&1 || true
    echo; echo "== $CLI install --help"; "$CLI" install --help 2>&1 || true
    echo; echo "== $CLI devices --help"; "$CLI" devices --help 2>&1 || true
    echo; echo "== files"; ls -la .tools
} > .tools/cli-help.txt
cat .tools/cli-help.txt

# Turn on the push hook (.githooks/pre-push) that installs new builds on the TV.
git config core.hooksPath .githooks
echo "Push hook enabled: git push now installs new builds on the TV."
