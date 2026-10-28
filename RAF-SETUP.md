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

## Search from your phone (1.2.0)
- The TV's search screen shows a QR code. Scan it with your phone's camera to open the phone page
  (`docs/phone/index.html`, served by GitHub Pages). Type or use the keyboard's mic, tap Send, and
  the search runs on the TV. Nothing is mirrored. Pasted links open directly.
- Messages travel through the ntfy.sh relay on a random private channel the TV creates on first
  run (stored on the TV under `rafhome.phone.v1`). Only searches pass through it.
- Raf Home must be open on the TV to receive them.
- One-time setup: GitHub repo → Settings → Pages → Deploy from a branch → `main` / `/docs`.
- Default engines are now light versions (DuckDuckGo Lite, mobile Wikipedia) for speed.
- QR codes are drawn with qrcode-generator by Kazuhiko Arase (MIT), in `src/js/vendor/`.

## Send to TV (1.3.0)
- Share a link from any app on the phone to **TV** (Android: install the phone page via Chrome's
  Add to Home screen; iPhone: the Shortcut steps on the phone page). Typed or pasted links work too.
- The TV shows a "From your phone" card, then routes it (`src/js/share.js`):
  YouTube → the YouTube app (cast-style DIAL hand-off, then the app, then the browser);
  direct video files (.mp4, .m3u8, .webm…) → Raf Home's player (`src/js/player.js`);
  Netflix / iPlayer / ITVX / Channel 4 / Prime / Disney+ / Spotify → that app's home screen;
  anything else → the TV's browser; plain words → search.
- Player: OK pause/play, Left/Right 10 s, Back closes; the phone page shows "Now on the TV" with
  the same controls. Status goes TV → phone on the `<topic>-status` channel.
- YouTube links now open **TizenTube** (ad-free) first, the stock app only if reinstalled, then
  the browser. To play a specific video ad-free from the phone, pair ReVanced/YouTube with
  TizenTube via Settings → Link with TV code on the TV.
- The YouTube hand-off is undocumented by Samsung; if it lands in the browser instead of the app,
  that route did not work on this firmware.
