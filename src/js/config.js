/*
 * Home screen content.
 *
 * apps: each entry picks the first installed app matching it:
 *   { id: 'org.tizen.netflix-app' }   exact app id (most reliable; see "All apps", the id of
 *                                     the focused app is shown at the bottom)
 *   { match: 'netflix' }              case-insensitive regex on id or name
 *   label                             optional display name
 *   brand                             optional key from js/brands.js (otherwise guessed from the name)
 * Entries that match nothing are skipped.
 *
 * inputs: HDMI ports shown in the second row. Set `hdmi` to the port each device is plugged into.
 */
window.LAUNCHER_CONFIG = {
    // Tuned for a UK Samsung AU7100. Entries that are not installed are simply skipped, and a
    // list in `match` is tried in order, so TizenTube (ad-free) wins over the stock YouTube app.
    apps: [
        { match: ['tizentube', 'youtube'], label: 'YouTube', brand: 'youtube' },
        { id: 'org.tizen.netflix-app', match: 'netflix', label: 'Netflix' },
        { match: 'iplayer', label: 'BBC iPlayer', brand: 'iplayer' },
        { match: ['itvx', '\\bitv\\b'], label: 'ITVX', brand: 'itvx' },
        { match: ['channel ?4', '\\b4od\\b'], label: 'Channel 4', brand: 'channel4' },
        { match: 'prime ?video', label: 'Prime Video' },
        { match: 'disney', label: 'Disney+' },
        { match: 'spotify', label: 'Spotify' },
        { id: 'com.samsung.tv.aria-video', match: 'apple ?tv', label: 'Apple TV' },
        // Overscan (desktop-style browser) if it is installed, otherwise Samsung's Internet app.
        { match: ['overscan', '^org\\.tizen\\.browser$', '^internet$'], label: 'Web' }
    ],

    // HDMI inputs shown in the second row. The Mac is assumed on HDMI 1: if it is on another
    // port, change it on the TV in Settings → Inputs (or here). Add more devices the same way;
    // brands with tiles: 'mac' | 'playstation' | 'xbox' | 'switch'.
    inputs: [
        { hdmi: 1, label: 'Mac', brand: 'mac' }
    ],

    // How an input tile switches the TV: 'switch+viewer' (default), 'switch' or 'inapp'.
    inputMethod: 'switch+viewer',

    locale: 'en-GB',

    theme: {
        // Starting wallpaper (key from js/wallpapers.js), or null for none (plain gradient).
        // Changed from Settings → Background; the TV remembers the choice.
        wallpaper: null
    },

    /*
     * Weather shown in the screen saver's corner, from Open-Meteo. No API key and nothing to
     * keep secret, so this is the whole setup: put your own coordinates here (two decimals is
     * plenty, and is also about as precise as you want a public request to be). Leave them null
     * and the widget never appears.
     *
     * There is no Settings page for this on purpose — the TV does not move, and coordinates are
     * not something you type with a remote.
     */
    weather: {
        latitude: null,
        longitude: null,
        unit: 'celsius'         // 'celsius' | 'fahrenheit'
    },

    /*
     * EXPERIMENTAL navigation sound. Synthesised, so there is no audio file. `move` plays when
     * focus changes, `edge` when it cannot (the end of a row). Tune by ear in the browser
     * preview; `volume` is 0–1 and sits on top of the TV's own volume.
     *
     * Whether this is worth keeping depends on the TV's audio latency: run
     * "Sound: report audio latency" in the Lab screen. Set enabled to false to silence it.
     */
    sound: {
        enabled: true,
        preset: 'soft',
        volume: 0.08,
        minGapMs: 45,
        presets: {
            soft: { label: 'Soft', freq: 620, ms: 30, type: 'sine' },
            warm: { label: 'Warm', freq: 520, ms: 44, type: 'triangle' },
            bright: { label: 'Bright', freq: 1040, ms: 30, type: 'triangle' }
        },
        move: { freq: 880, ms: 38, type: 'triangle' },
        edge: { freq: 200, ms: 70, type: 'sine' },
        select: { freq: 1320, ms: 55, type: 'triangle' }
    },

    // Development only: where the Lab screen sends its logs (npm run devlog on your computer).
    // null disables it; set it to http://<your-computer-ip>:8099/log while debugging.
    devLogUrl: null
};

/*
 * Local overrides from js/config.local.js, which is gitignored and loaded just before this file.
 * That is where values specific to one TV belong — coordinates, a devlog address — so this file
 * can stay in the repository with nulls in it. Nothing to strip before a push, nothing to put
 * back before a build, and the overlay reaches the browser preview and the .wgt alike.
 *
 * Merged one level deep, so a local file can set weather.latitude without restating the rest of
 * the block. Arrays (apps, inputs) and plain values replace the default outright.
 */
(function () {
    'use strict';

    var local = window.LAUNCHER_LOCAL;
    if (!local) return;

    function plainObject(v) {
        return v && typeof v === 'object' && !Array.isArray(v);
    }

    Object.keys(local).forEach(function (key) {
        if (plainObject(local[key]) && plainObject(window.LAUNCHER_CONFIG[key])) {
            Object.keys(local[key]).forEach(function (inner) {
                window.LAUNCHER_CONFIG[key][inner] = local[key][inner];
            });
        } else {
            window.LAUNCHER_CONFIG[key] = local[key];
        }
    });
})();
