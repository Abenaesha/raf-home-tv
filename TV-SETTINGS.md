# TV settings applied (Samsung UE58AU7100, Tizen 6.0)

Changes made with the remote, outside Raf Home. All reversible. Recorded here because a
factory reset or some firmware updates can undo them.

## Ad / tracking
- **DNS set to 94.140.14.14** (AdGuard ad-blocking) — Settings → General → Network →
  Network Status → IP Settings → DNS setting → Enter manually. Blocks ad/tracker domains
  across all apps. Undo: set DNS back to "Get automatically".
- Turn off **Viewing Information Services** (ACR tracking), **Interest-Based Advertisement**,
  voice data — Settings → General & Privacy → Terms & Privacy. (Confirm these are off.)

## Faster / cleaner boot
- **Autorun Smart Hub** — OFF (Settings → General → Smart Features)
- **Autorun Last App** — OFF
- **Autorun Samsung TV Plus** — OFF
- Device Care → scan + clear cache (Settings → Support → Device Care) — do occasionally.

## Apps on the TV (from `npm run tv-report`, 2026-10-28)
Kept: Raf Home, YouTube, Plex, Tubi, Browser.
Removable junk: e-Manual, Gallery (not removed — negligible gain).
Note: Samsung's ad/ACR/telemetry packages are protected system apps; sdb cannot remove them,
so DNS + the privacy toggles above are the real mitigation, not app removal.

## What's left to try
- TizenTube (Apps2Samsung) for ad-free YouTube on the TV.
- A Google TV box (e.g. Xiaomi TV Box S 3rd gen) on HDMI to escape the slow Tizen engine
  entirely, then CleanYourTV on it.
