/*
 * Raf Home's own video player, for direct video links sent from the phone (.mp4, .m3u8 and the
 * like). It uses the TV's built-in <video> decoding, so it plays smoothly where the browser would
 * struggle.
 *
 * Remote: OK pauses or plays, Left and Right skip 10 seconds, Back closes. The phone page can do
 * the same (Player.control) and sees what is playing through PhoneLink.publish.
 *
 * Written for Tizen 6.0 (Chromium 76): ES5 only.
 */
(function () {
    'use strict';

    var KEY = UI.KEY;
    // Media keys on Samsung remotes, registered so they reach the app.
    var MEDIA = { PLAY_PAUSE: 10252, PLAY: 415, PAUSE: 19, STOP: 413, REWIND: 412, FORWARD: 417 };
    var SKIP = 10;
    var HIDE_AFTER_MS = 4000;
    var STATUS_EVERY_MS = 10000;

    var state = { url: '', title: '', open: false, hideTimer: null, lastStatus: 0 };

    function $(id) { return document.getElementById(id); }
    function video() { return $('player-video'); }

    function fmt(sec) {
        if (!isFinite(sec) || sec < 0) sec = 0;
        sec = Math.floor(sec);
        var h = Math.floor(sec / 3600);
        var m = Math.floor((sec % 3600) / 60);
        var s = sec % 60;
        var mm = (h && m < 10 ? '0' : '') + m;
        return (h ? h + ':' : '') + mm + ':' + (s < 10 ? '0' : '') + s;
    }

    function fileName(url) {
        var path = url.split(/[?#]/)[0];
        return decodeURIComponent(path.substring(path.lastIndexOf('/') + 1)) || url;
    }

    function publish(force) {
        var v = video();
        var now = Date.now();
        if (!force && now - state.lastStatus < STATUS_EVERY_MS) return;
        state.lastStatus = now;
        if (!window.PhoneLink) return;
        PhoneLink.publish({
            state: !state.open ? 'stopped' : (v.paused ? 'paused' : 'playing'),
            via: 'player',
            title: state.title,
            at: Math.floor(v.currentTime || 0),
            dur: isFinite(v.duration) ? Math.floor(v.duration) : 0
        });
    }

    function render() {
        var v = video();
        var dur = isFinite(v.duration) ? v.duration : 0;
        $('player-progress-fill').style.transform = 'scaleX(' + (dur ? Math.min(1, v.currentTime / dur) : 0) + ')';
        $('player-time').textContent = fmt(v.currentTime);
        $('player-duration').textContent = dur ? fmt(dur) : '';
        $('player-state').textContent = v.paused ? 'Paused' : '';
        $('player').classList.toggle('paused', v.paused);
    }

    // The overlay shows on any key and fades after a few seconds; it stays up while paused.
    function wake() {
        $('player').classList.add('chrome');
        clearTimeout(state.hideTimer);
        state.hideTimer = setTimeout(function () {
            if (!video().paused) $('player').classList.remove('chrome');
        }, HIDE_AFTER_MS);
    }

    function toggle() {
        var v = video();
        if (v.paused) v.play().catch(function () {});
        else v.pause();
        wake();
    }

    function seek(delta) {
        var v = video();
        var dur = isFinite(v.duration) ? v.duration : Infinity;
        v.currentTime = Math.max(0, Math.min(dur - 1, (v.currentTime || 0) + delta));
        render();
        wake();
        publish(true);
    }

    function play(url, title) {
        state.url = url;
        state.title = title || fileName(url);
        state.open = true;
        $('player-title').textContent = state.title;
        $('player-sub').textContent = fileName(url) + ' · sent from your phone';
        var v = video();
        v.src = url;
        UI.show('player');
        v.play().catch(function () { /* the error handler deals with unplayable sources */ });
        wake();
        publish(true);
    }

    function stop(silent) {
        if (!state.open) return;
        state.open = false;
        var v = video();
        v.pause();
        v.removeAttribute('src');
        v.load();
        clearTimeout(state.hideTimer);
        if (UI.isVisible('player')) UI.back();
        if (!silent) publish(true);
    }

    function control(cmd) {
        if (!state.open) return;
        if (cmd === 'toggle') toggle();
        else if (cmd === 'back10') seek(-SKIP);
        else if (cmd === 'fwd10') seek(SKIP);
        else if (cmd === 'stop') stop();
    }

    function init() {
        try {
            tizen.tvinputdevice.registerKeyBatch(['MediaPlayPause', 'MediaPlay', 'MediaPause', 'MediaStop',
                'MediaRewind', 'MediaFastForward']);
        } catch (e) {
            // No media keys (preview, or an older remote): OK and arrows still work.
        }

        var v = video();
        v.addEventListener('timeupdate', function () { render(); publish(false); });
        v.addEventListener('play', function () { render(); publish(true); });
        v.addEventListener('pause', function () { render(); wake(); publish(true); });
        v.addEventListener('loadedmetadata', render);
        v.addEventListener('ended', function () { stop(); });
        v.addEventListener('error', function () {
            if (!state.open) return;
            var url = state.url;
            UI.toast('This video will not play here. Opening it in the browser.');
            stop(true);
            Search.openUrl(url);
            if (window.PhoneLink) PhoneLink.publish({ state: 'opened', via: 'browser', title: state.title });
        });

        UI.register('player', {
            el: $('player'),
            hints: null,
            onKey: function (k) {
                switch (k) {
                    case KEY.ENTER: case MEDIA.PLAY_PAUSE: toggle(); return true;
                    case MEDIA.PLAY: if (video().paused) toggle(); return true;
                    case MEDIA.PAUSE: if (!video().paused) toggle(); return true;
                    case KEY.LEFT: case MEDIA.REWIND: seek(-SKIP); return true;
                    case KEY.RIGHT: case MEDIA.FORWARD: seek(SKIP); return true;
                    case KEY.UP: case KEY.DOWN: wake(); return true;
                    case KEY.BACK: case KEY.ESC: case KEY.BACKSPACE: case MEDIA.STOP: stop(); return true;
                    default: return false;
                }
            }
        });

        // Leaving Raf Home (Home button, another app) pauses rather than playing to nobody.
        document.addEventListener('visibilitychange', function () {
            if (document.hidden && state.open && !video().paused) video().pause();
        });
    }

    window.Player = {
        init: init, play: play, stop: stop, control: control,
        isOpen: function () { return state.open; }
    };
})();
