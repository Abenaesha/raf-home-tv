/*
 * Web search: the bar on Home opens this screen. Type with the remote's on-screen keyboard, the
 * SmartThings phone keyboard (including the phone's dictation mic) or a Bluetooth keyboard, pick
 * an engine, and the query opens in the TV's browser.
 *
 * Engines come from config.js (`search.engines`); recent searches and the chosen engine are kept
 * in their own localStorage key so Prefs.reset() and the settings schema are left alone.
 *
 * Written for Tizen 6.0 (Chromium 76): ES5 only, no flex gap.
 */
(function () {
    'use strict';

    var KEY = UI.KEY;
    var IME_DONE = 65376;
    var IME_CANCEL = 65385;
    var STORE = 'rafhome.search.v1';
    var MAX_RECENT = 5;

    // Light versions first: the TV's browser (Chromium 76) is slow on heavy pages.
    var DEFAULT_ENGINES = [
        { key: 'ddg', label: 'DuckDuckGo', url: 'https://lite.duckduckgo.com/lite/?q=' },
        { key: 'google', label: 'Google', url: 'https://www.google.com/search?q=' },
        { key: 'youtube', label: 'YouTube', url: 'https://www.youtube.com/results?search_query=' },
        { key: 'wikipedia', label: 'Wikipedia', url: 'https://en.m.wikipedia.org/w/index.php?search=' },
        { key: 'bbc', label: 'BBC', url: 'https://www.bbc.co.uk/search?q=' }
    ];

    var state = { engine: null, recent: [], typing: false };

    function $(id) { return document.getElementById(id); }

    function engines() {
        var cfg = window.LAUNCHER_CONFIG.search || {};
        return cfg.engines && cfg.engines.length ? cfg.engines : DEFAULT_ENGINES;
    }

    function load() {
        try {
            var saved = JSON.parse(localStorage.getItem(STORE)) || {};
            state.engine = saved.engine || null;
            state.recent = Array.isArray(saved.recent) ? saved.recent.slice(0, MAX_RECENT) : [];
        } catch (e) {
            state.recent = [];
        }
        var list = engines();
        var known = list.some(function (e) { return e.key === state.engine; });
        if (!known) state.engine = list[0].key;
    }

    function save() {
        try {
            localStorage.setItem(STORE, JSON.stringify({ engine: state.engine, recent: state.recent }));
        } catch (e) {
            // Storage unavailable: searching still works, it just is not remembered.
        }
    }

    function engine() {
        var list = engines();
        for (var i = 0; i < list.length; i++) if (list[i].key === state.engine) return list[i];
        return list[0];
    }

    // "bbc.co.uk", "www.example.com/page" or a full URL opens directly; anything else is a search.
    function toUrl(text) {
        if (/^https?:\/\//i.test(text)) return text;
        if (!/\s/.test(text) && /^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(text)) return 'https://' + text;
        return engine().url + encodeURIComponent(text);
    }

    function remember(text) {
        state.recent = [text].concat(state.recent.filter(function (r) {
            return r.toLowerCase() !== text.toLowerCase();
        })).slice(0, MAX_RECENT);
        save();
    }

    function launchFailed(url, e) {
        if (window.DevLog) DevLog.log('Search: browser launch failed', { url: url, error: String(e && e.message || e) });
        UI.toast('Could not open the browser');
    }

    // Hands the address to the TV's browser. Tries the generic "view" request first, then
    // Samsung's browser by id, so a TV that answers either one works.
    function openUrl(url) {
        if (window.__TIZEN_MOCK__) {
            UI.toast('Preview: would open ' + url);
            return;
        }
        try {
            var control = new tizen.ApplicationControl('http://tizen.org/appcontrol/operation/view', url);
            tizen.application.launchAppControl(control, null, function () {}, function () {
                try {
                    tizen.application.launchAppControl(control, 'org.tizen.browser', function () {},
                        function (e) { launchFailed(url, e); });
                } catch (e2) {
                    launchFailed(url, e2);
                }
            });
        } catch (e) {
            launchFailed(url, e);
        }
    }

    function run(text) {
        text = (text || '').trim();
        if (!text) {
            UI.toast('Type something to search for');
            startTyping();
            return;
        }
        remember(text);
        // Clear the box so the next search starts fresh; the query is kept under Recent.
        $('search-input').value = '';
        render();
        openUrl(toUrl(text));
    }

    // ---------- rendering

    function chip(e) {
        var c = UI.el('div', 'search-chip' + (e.key === state.engine ? ' on' : ''), e.label);
        c._item = { kind: 'engine', key: e.key };
        return c;
    }

    function recentRow(text) {
        var row = UI.el('div', 'search-recent');
        row.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.6-3.6"/></svg>';
        row.appendChild(document.createTextNode(text));
        row._item = { kind: 'recent', text: text };
        return row;
    }

    function render() {
        var chips = $('search-engines');
        chips.innerHTML = '';
        engines().forEach(function (e) { chips.appendChild(chip(e)); });
        var list = $('search-recent-list');
        list.innerHTML = '';
        state.recent.forEach(function (r) { list.appendChild(recentRow(r)); });
        $('search-recent-block').classList.toggle('hidden', !state.recent.length);
        $('search-placeholder-engine').textContent = engine().label;
        renderPhone();
    }

    // The QR code for the phone page. Drawn once; the topic does not change.
    function renderPhone() {
        var box = $('search-phone-qr');
        if (box.firstChild || !window.PhoneLink) return;
        var svg = PhoneLink.qrSvg();
        if (svg) box.innerHTML = svg;
        else $('search-phone').classList.add('hidden');
    }

    // A search sent from the phone page: show it on the search screen, then run it.
    function fromPhone(msg) {
        if (window.Screensaver && Screensaver.close) Screensaver.close();
        if (msg.e && engines().some(function (e) { return e.key === msg.e; })) {
            state.engine = msg.e;
            save();
        }
        if (!UI.isVisible('search')) UI.show('search', { fromPhone: true });
        if (state.typing) stopTyping();
        render();
        $('search-input').value = msg.q;
        UI.toast('From your phone: ' + msg.q);
        setTimeout(function () { run(msg.q); }, 700);
    }

    // ---------- typing

    function startTyping() {
        state.typing = true;
        UI.focusOn($('search-field'));
        var input = $('search-input');
        setTimeout(function () {
            input.focus();
            input.setSelectionRange(input.value.length, input.value.length);
        }, 0);
        UI.refreshHints();
    }

    function stopTyping() {
        state.typing = false;
        $('search-input').blur();
        UI.refreshHints();
    }

    function cycleEngine(step) {
        var list = engines();
        var i = 0;
        for (var j = 0; j < list.length; j++) if (list[j].key === state.engine) i = j;
        state.engine = list[(i + step + list.length) % list.length].key;
        save();
        render();
        UI.refresh();
    }

    // Down from the box lands on the engine in use, not whichever chip sits nearest.
    function focusChosenEngine() {
        UI.focusOn(document.querySelector('#search-engines .search-chip.on') ||
            UI.children($('search-engines'))[0]);
    }

    function init() {
        load();
        $('search-field')._item = { kind: 'field' };
        $('search-input').addEventListener('blur', function () {
            // The TV's keyboard can close itself (its own Done/Back); keep our state in step.
            if (state.typing) {
                state.typing = false;
                UI.refreshHints();
            }
        });

        UI.register('search', {
            el: $('search'),
            rows: function () {
                var r = [[$('search-field')], UI.children($('search-engines'))];
                UI.children($('search-recent-list')).forEach(function (e) { r.push([e]); });
                return r;
            },
            hints: function () {
                if (state.typing) return [['OK', 'Search'], ['▼', 'Engines']];
                return [['OK', 'Type / select'], ['◀ ▶', 'Engine'], ['Back', 'Home']];
            },
            onShow: function (opts) {
                render();
                // From the phone the query arrives on its own: no keyboard on the TV.
                if (!opts.back && !opts.fromPhone) {
                    $('search-input').value = '';
                    startTyping();
                }
            },
            activate: function (item) {
                if (item.kind === 'field') startTyping();
                else if (item.kind === 'engine') {
                    state.engine = item.key;
                    save();
                    render();
                    startTyping();
                } else if (item.kind === 'recent') {
                    $('search-input').value = item.text;
                    run(item.text);
                }
            },
            onKey: function (k) {
                if (state.typing) {
                    if (k === KEY.ENTER || k === IME_DONE) {
                        stopTyping();
                        run($('search-input').value);
                        return true;
                    }
                    if (k === IME_CANCEL || k === KEY.BACK || k === KEY.ESC || k === KEY.DOWN) {
                        stopTyping();
                        if (k === KEY.DOWN) focusChosenEngine();
                        return true;
                    }
                    return 'pass';
                }
                var onField = document.querySelector('#search-field.focused');
                if (onField && k === KEY.DOWN) {
                    focusChosenEngine();
                    return true;
                }
                if (onField && (k === KEY.LEFT || k === KEY.RIGHT)) {
                    cycleEngine(k === KEY.LEFT ? -1 : 1);
                    return true;
                }
                return false;
            }
        });
    }

    window.Search = {
        init: init, open: function () { UI.show('search'); }, toUrl: toUrl, fromPhone: fromPhone,
        openUrl: openUrl
    };
})();
