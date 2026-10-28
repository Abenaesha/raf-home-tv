# Raf Home: Samsung UE58AU7100 (2021, Tizen 6.0)

Fork of Arn0 Launcher (MIT, Arnaud Etienne), adapted for this TV.

## What changed from upstream
- Tizen 6.0 support: the TV's Chromium 76 has no flex `gap`, so those rules now use margins.
- Own app identity: `RafHomeTV1.Launcher`, named "Raf Home", so it never clashes with Arn0.
- UK apps on Home: YouTube (TizenTube preferred, stock YouTube as fallback), Netflix, BBC iPlayer,
  ITVX, Channel 4, Prime Video, Disney+, Spotify, Apple TV, Web (Overscan if installed, else Samsung Internet).
  Anything not installed is skipped.
- `match` in config.js accepts a list tried in order (used for the YouTube and Web fallbacks).
- "Consoles" row renamed "Inputs", with HDMI 1 to 3. Rename them on the TV: Settings → Inputs.
- Weather for Manchester in the screen saver (src/js/config.local.js).
- Removed the author's personal hidden game (its images are not in the repo).
- The Home-button helper in native/ is NOT adapted. Open Raf Home from the app list instead.

## Install
1. TV: Apps, press 1 2 3 4 5, Developer Mode On, Host PC IP = your computer's IP, restart (hold power).
2. Computer on the same Wi-Fi: install Apps2Samsung, let it find the TV (192.168.1.102).
3. Choose "Custom WGT File" and pick `release/raf-home.wgt`. It signs and installs it.
4. On the TV: Apps → Raf Home.

Updates: install a new build the same way, from the same computer, so the certificate matches.
A mismatch forces an uninstall, which clears the launcher's saved settings.

## Edit and preview
    npm run preview   # http://localhost:8080, arrow keys + Enter, Esc = Back
    npm run build     # -> dist/arn0-launcher.wgt

## Search (1.1.0)
- A phone-style search bar sits beside the clock. Press Up from the apps row, then OK.
- Type with the remote's keyboard, the SmartThings phone app (its keyboard mic lets you dictate)
  or a Bluetooth keyboard. OK searches; Down picks the engine (Google, DuckDuckGo, YouTube,
  Wikipedia, BBC). Typing an address like `bbc.co.uk/sport` opens it directly.
- Results open in the TV's browser. Engines are editable in `src/js/config.js` (`search.engines`).
- Recent searches and the chosen engine are stored on the TV (`rafhome.search.v1`).

## Automatic install on push
One-time setup on the Mac: `npm run setup-cli`. It downloads the Apps2Samsung CLI into `.tools/`
(checksum-verified, gitignored) and turns on the push hook.

- `git push`: if the push includes a new `release/raf-home.wgt`, the hook installs it on the TV
  and opens it. If the TV is off or unreachable it only warns; the push always goes through.
  Skip once with `RAF_NO_DEPLOY=1 git push`.
- `npm run deploy`: install the current package now, without pushing.
- `RAF_ALLOW_REMOVE=1 npm run deploy`: when the TV's copy was signed by another certificate
  (e.g. first installed from the Apps2Samsung window), remove it and reinstall. This erases
  Raf Home's settings on the TV; later updates keep them.
- `npm run release`: build and copy the package into `release/`.
- TV address: 192.168.1.102 by default; override with `RAF_TV_IP=...`. Reserving that address for
  the TV in your router stops it from changing.
