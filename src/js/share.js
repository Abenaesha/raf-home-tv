/*
 * Things shared from the phone ("Send to TV"). Each link takes the fastest route the TV has:
 *
 *   YouTube video        the YouTube app on the TV, at that video
 *   direct video file    Raf Home's own player (js/player.js)
 *   Netflix, iPlayer...  that app on the TV (these apps take no links from other apps, so it
 *                        opens at its home screen)
 *   anything else        the TV's browser
 *   plain words          a search (js/search.js)
 *
 * A card shows what arrived and where it is going before anything opens.
 *
 * YouTube hand-off: Samsung documents no way for one app to open a YouTube video in another, so
 * this tries the routes phones use when they cast (DIAL on the TV itself), then the YouTube app
 * with the link, then the browser. A route counts as working when Raf Home goes to the background.
 *
 * Written for Tizen 6.0 (Chromium 76): ES5 only.
 */
(function () {
    'use strict';

    var CARD_MS = 1600;

    // Streaming apps by web address. `match` uses the same patterns as config.js apps.
    var APP_LINKS = [
        { re: /(^|\.)netflix\.com$/i, match: ['netflix'], label: 'Netflix' },
        { re: /(^|\.)bbc\.co\.uk$/i, path: /^\/iplayer/i, match: ['iplayer'], label: 'BBC iPlayer' },
        { re: /(^|\.)itv\.com$/i, match: ['itvx', '\\bitv\\b'], label: 'ITVX' },
        { re: /(^|\.)channel4\.com$/i, match: ['channel ?4'], label: 'Channel 4' },
        { re: /(^|\.)primevideo\.com$/i, match: ['prime ?video'], label: 'Prime Video' },
        { re: /(^|\.)amazon\.co\.uk$/i, path: /\/(gp\/video|video)\b/i, match: ['prime ?video'], label: 'Prime Video' },
        { re: /(^|\.)disneyplus\.com$/i, match: ['disney'], label: 'Disney+' },
        { re: /(^|\.)spotify\.com$/i, match: ['spotify'], label: 'Spotify' }
    ];

    function cfg() {
        var c = window.LAUNCHER_CONFIG.share || {};
        return {
            youtubeAppId: c.youtubeAppId || '111299001912',
            dialUrl: c.dialUrl || 'http://127.0.0.1:8080/ws/apps/YouTube',
            handoffWaitMs: c.handoffWaitMs || 5000
        };
    }

    function $(id) { return document.getElementById(id); }

    function firstUrl(text) {
        var m = /https?:\/\/[^\s<>"']+/i.exec(text || '');
        return m ? m[0].replace(/[).,;!?]+$/, '') : '';
    }

    // Splits a URL without relying on URL() quirks in the TV's engine.
    function parts(url) {
        var a = document.createElement('a');
        a.href = url;
        return { host: a.hostname.replace(/^www\./i, ''), path: a.pathname || '/', search: a.search || '' };
    }

    function param(search, name) {
        var m = new RegExp('[?&]' + name + '=([^&#]*)').exec(search);
        return m ? decodeURIComponent(m[1]) : '';
    }

    // { id, t } for a YouTube video link, else null. Handles watch, youtu.be, shorts and live.
    function youtube(url) {
        var p = parts(url);
        var id = '';
        if (/^youtu\.be$/i.test(p.host)) id = p.path.slice(1).split('/')[0];
        else if (/(^|\.)youtube\.com$/i.test(p.host)) {
            if (/^\/watch/i.test(p.path)) id = param(p.search, 'v');
            else {
                var m = /^\/(shorts|live|embed)\/([^/?#]+)/i.exec(p.path);
                if (m) id = m[2];
            }
        }
        if (!/^[A-Za-z0-9_-]{11}$/.test(id)) return null;
        var t = parseInt(param(p.search, 't'), 10);
        return { id: id, t: isNaN(t) ? 0 : t };
    }

    function isMedia(url) {
        return /\.(mp4|m4v|webm|mov|m3u8|mpd)$/i.test(parts(url).path);
    }

    function appFor(url) {
        var p = parts(url);
        for (var i = 0; i < APP_LINKS.length; i++) {
            var l = APP_LINKS[i];
            if (!l.re.test(p.host)) continue;
            if (l.path && !l.path.test(p.path)) continue;
            var app = Apps.curated(Home.apps(), { apps: [{ match: l.match, label: l.label }] })[0];
            if (app) return app;
        }
        return null;
    }

    function decide(msg) {
        var url = msg.url || firstUrl(msg.text);
        if (!url) return { kind: 'search', q: (msg.text || '').trim() };
        var yt = youtube(url);
        if (yt) return { kind: 'youtube', url: url, yt: yt, label: 'Opening in YouTube' };
        if (isMedia(url)) return { kind: 'player', url: url, label: 'Playing here' };
        var app = appFor(url);
        if (app) return { kind: 'app', url: url, app: app, label: 'Opening ' + app.label };
        return { kind: 'web', url: url, label: 'Opening in the browser' };
    }

    function shortTitle(msg, route) {
        if (msg.title && msg.title.trim()) return msg.title.trim();
        if (route.kind === 'youtube') return 'YouTube video';
        var p = parts(route.url);
        var path = p.path === '/' ? '' : p.path;
        return p.host + (path.length > 40 ? path.slice(0, 40) + '…' : path);
    }

    // ---------- the "From your phone" card

    var cardTimer = null;

    function showCard(title, label, thumb) {
        var card = $('share-card');
        $('share-card-title').textContent = title;
        $('share-card-action').textContent = label;
        var img = $('share-card-thumb');
        img.style.backgroundImage = thumb ? 'url("' + thumb + '")' : '';
        img.classList.toggle('hidden', !thumb);
        card.classList.remove('hidden');
        // Restart the progress bar animation.
        var bar = $('share-card-bar');
        bar.classList.remove('run');
        void bar.offsetWidth;
        bar.classList.add('run');
        clearTimeout(cardTimer);
        cardTimer = setTimeout(hideCard, CARD_MS + 4000);
    }

    function hideCard() {
        clearTimeout(cardTimer);
        $('share-card').classList.add('hidden');
    }

    // ---------- routes

    function status(state, via, title) {
        if (window.PhoneLink) PhoneLink.publish({ state: state, via: via, title: title });
    }

    // Runs each attempt in turn until Raf Home goes to the background (something opened over it).
    function attempts(list, title, via) {
        var i = 0;
        function next() {
            if (document.hidden) {
                status('opened', via, title);
                return;
            }
            if (i >= list.length) {
                UI.toast('Could not open it on the TV');
                status('error', via, title);
                return;
            }
            var step = list[i++];
            try { step.run(); } catch (e) { if (window.DevLog) DevLog.log('Share: ' + step.name + ' failed', String(e)); }
            if (i < list.length) setTimeout(next, cfg().handoffWaitMs);
            else setTimeout(function () { if (document.hidden) status('opened', via, title); }, cfg().handoffWaitMs);
        }
        next();
    }

    function openYouTube(route, title) {
        var c = cfg();
        var id = route.yt.id;
        var body = 'v=' + id + (route.yt.t ? '&t=' + route.yt.t : '');
        var watch = 'https://www.youtube.com/watch?v=' + id + (route.yt.t ? '&t=' + route.yt.t + 's' : '');
        attempts([
            {
                // The request phones make when casting: DIAL on the TV's own port 8080.
                name: 'DIAL', run: function () {
                    fetch(c.dialUrl, { method: 'POST', mode: 'no-cors', body: body }).catch(function () {});
                }
            },
            {
                name: 'YouTube app', run: function () {
                    var control = new tizen.ApplicationControl('http://tizen.org/appcontrol/operation/view', watch);
                    tizen.application.launchAppControl(control, c.youtubeAppId, function () {}, function () {});
                }
            },
            { name: 'browser', run: function () { Search.openUrl(watch); } }
        ], title, 'youtube');
    }

    function receive(msg) {
        if (window.Screensaver && Screensaver.close) Screensaver.close();
        var route = decide(msg);
        if (route.kind === 'search') {
            if (route.q) Search.fromPhone({ q: route.q });
            return;
        }
        if (window.Player && Player.isOpen() && route.kind !== 'player') Player.stop();
        var title = shortTitle(msg, route);
        var thumb = route.kind === 'youtube' ? 'https://i.ytimg.com/vi/' + route.yt.id + '/hqdefault.jpg' : '';
        showCard(title, route.label, thumb);
        status('arriving', route.kind, title);
        setTimeout(function () {
            if (route.kind === 'player') {
                hideCard();
                Player.play(route.url, title);
            } else if (route.kind === 'youtube') {
                openYouTube(route, title);
            } else if (route.kind === 'app') {
                Apps.launch(route.app.id).then(function () { status('opened', 'app', route.app.label); })
                    .catch(function () { UI.toast('Could not open ' + route.app.label); status('error', 'app', title); });
            } else {
                Search.openUrl(route.url);
                status('opened', 'browser', title);
            }
        }, CARD_MS);
    }

    // Leaving and coming back to Raf Home: the card has done its job.
    document.addEventListener('visibilitychange', function () { if (!document.hidden) hideCard(); });

    window.Share = { receive: receive, decide: decide, youtube: youtube, isMedia: isMedia };
})();
