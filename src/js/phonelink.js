/*
 * Phone link: search from your phone without mirroring it.
 *
 * The TV cannot accept connections, so the phone and the TV meet on a relay: ntfy.sh, a free,
 * open-source publish/subscribe service. This TV picks a long random channel name ("topic") the
 * first time it runs, keeps it in localStorage and shows it as a QR code on the search screen.
 * The phone page (docs/phone/index.html, served by GitHub Pages) posts each search to that topic;
 * the TV listens with EventSource and runs it.
 *
 * Only someone who knows the topic can send to this TV, and all they can do is open a search or
 * a web page here. Searches pass through the relay; nothing else does.
 *
 * Messages, phone to TV (JSON; plain text from e.g. the ntfy app counts as a search):
 *   {"q": "words", "e": "engineKey"}          search
 *   {"kind": "share", "url": "...", "title"}  something shared from the phone (js/share.js)
 *   {"kind": "ctl", "cmd": "toggle"}          player control: toggle | back10 | fwd10 | stop
 * Status, TV to phone, on "<topic>-status" (see publish):
 *   {"state": "playing", "via": "player", "title": "...", "at": 12, "dur": 300}
 *
 * Listens only while Raf Home is running: on a Tizen TV a web app is paused in the background.
 *
 * Written for Tizen 6.0 (Chromium 76): ES5 only.
 */
(function () {
    'use strict';

    var STORE = 'rafhome.phone.v1';
    var source = null;
    var handler = null;
    var seen = {};
    var topic = null;

    function cfg() {
        var p = window.LAUNCHER_CONFIG.phone || {};
        return {
            relay: (p.relay || 'https://ntfy.sh').replace(/\/+$/, ''),
            page: p.page || ''
        };
    }

    function randomTopic() {
        var chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        var out = 'rafhome-';
        var bytes = new Uint8Array(24);
        if (window.crypto && window.crypto.getRandomValues) {
            window.crypto.getRandomValues(bytes);
        } else {
            for (var j = 0; j < bytes.length; j++) bytes[j] = Math.floor(Math.random() * 256);
        }
        for (var i = 0; i < bytes.length; i++) out += chars.charAt(bytes[i] % chars.length);
        return out;
    }

    function loadTopic() {
        try {
            var saved = JSON.parse(localStorage.getItem(STORE)) || {};
            if (saved.topic && /^rafhome-[a-z0-9]{24}$/.test(saved.topic)) return saved.topic;
        } catch (e) {
            // fall through and make a new one
        }
        var t = randomTopic();
        try { localStorage.setItem(STORE, JSON.stringify({ topic: t })); } catch (e2) { /* unsaved */ }
        return t;
    }

    function parse(raw) {
        if (!raw) return null;
        try {
            var m = JSON.parse(raw);
            if (m && typeof m.kind === 'string') return m;
            if (m && typeof m.q === 'string') return { q: m.q, e: m.e || null };
        } catch (e) {
            // plain text
        }
        return { q: String(raw), e: null };
    }

    function usable(msg) {
        if (!msg) return false;
        if (msg.kind === 'share') return !!(msg.url || msg.text);
        if (msg.kind === 'ctl' || msg.kind === 'nav') return typeof msg.cmd === 'string';
        if (msg.kind === 'shortcut') return !!msg.url;
        if (msg.kind) return false;
        return !!(msg.q && msg.q.trim());
    }

    // Tells the phone page what the TV is doing. Fire and forget: the TV never waits on it.
    function publish(status) {
        if (!topic || typeof fetch === 'undefined') return;
        status.time = Math.floor(Date.now() / 1000);
        try {
            fetch(cfg().relay + '/' + topic + '-status', { method: 'POST', body: JSON.stringify(status) })
                .catch(function () {});
        } catch (e) {
            // offline: the phone simply shows no status
        }
    }

    function onEvent(ev) {
        var data;
        try { data = JSON.parse(ev.data); } catch (e) { return; }
        if (!data || data.event !== 'message' || seen[data.id]) return;
        seen[data.id] = true;
        // Ignore anything older than two minutes (a relay replaying history after a reconnect).
        if (data.time && Date.now() / 1000 - data.time > 120) return;
        var msg = parse(data.message);
        if (usable(msg) && handler) handler(msg);
    }

    function connect() {
        if (source || typeof EventSource === 'undefined') return;
        source = new EventSource(cfg().relay + '/' + topic + '/sse');
        source.onmessage = onEvent;
        // EventSource reconnects by itself after a dropped connection; nothing to do on error.
    }

    function disconnect() {
        if (source) source.close();
        source = null;
    }

    function pageUrl() {
        var page = cfg().page;
        return page ? page + '#' + topic : '';
    }

    // An SVG QR code for the phone page address, or '' if no page is configured.
    function qrSvg() {
        var url = pageUrl();
        if (!url || typeof qrcode === 'undefined') return '';
        var qr = qrcode(0, 'M');
        qr.addData(url);
        qr.make();
        return qr.createSvgTag(8, 2);
    }

    function start(onMessage) {
        handler = onMessage;
        topic = loadTopic();
        connect();
        // Paused apps keep a dead connection on some TVs; reopen it when Raf Home comes back.
        document.addEventListener('visibilitychange', function () {
            if (document.hidden) {
                disconnect();
            } else {
                connect();
            }
        });
    }

    window.PhoneLink = {
        start: start, qrSvg: qrSvg, pageUrl: pageUrl, publish: publish,
        topic: function () { return topic; }
    };
})();
