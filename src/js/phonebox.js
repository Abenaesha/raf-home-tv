/*
 * Things the phone adds to Home: Watch Later (a queue of links to open this evening) and
 * Shortcuts (pinned websites). Both are filled from the phone page over the same channel as
 * Send to TV, and both live in the TV's localStorage.
 *
 * Watch Later is a FIFO-ish list you clear by opening items; Shortcuts are persistent bookmarks.
 *
 * Written for Tizen 6.0 (Chromium 76): ES5 only.
 */
(function () {
    'use strict';

    var KEY = UI.KEY;
    var LATER_STORE = 'rafhome.later.v1';
    var SHORTCUT_STORE = 'rafhome.shortcuts.v1';
    var LATER_MAX = 20;
    var SHORTCUT_MAX = 12;

    var later = [];
    var shortcuts = [];
    var listeners = [];

    function $(id) { return document.getElementById(id); }

    function load(store, cap) {
        try {
            var a = JSON.parse(localStorage.getItem(store));
            return Array.isArray(a) ? a.slice(0, cap) : [];
        } catch (e) {
            return [];
        }
    }

    function save(store, arr) {
        try { localStorage.setItem(store, JSON.stringify(arr)); } catch (e) { /* unsaved */ }
    }

    function notify() { listeners.forEach(function (fn) { try { fn(); } catch (e) {} }); }

    function cleanLabel(title, url) {
        if (title && title.trim()) return title.trim().slice(0, 40);
        var a = document.createElement('a');
        a.href = url;
        return a.hostname.replace(/^www\./, '') || url;
    }

    function addLater(url, title) {
        if (!url) return;
        later = [{ url: url, title: cleanLabel(title, url), ts: Date.now() }]
            .concat(later.filter(function (i) { return i.url !== url; })).slice(0, LATER_MAX);
        save(LATER_STORE, later);
        notify();
    }

    function removeLater(url) {
        later = later.filter(function (i) { return i.url !== url; });
        save(LATER_STORE, later);
        notify();
    }

    function addShortcut(url, title) {
        if (!url) return;
        shortcuts = [{ url: url, label: cleanLabel(title, url) }]
            .concat(shortcuts.filter(function (i) { return i.url !== url; })).slice(0, SHORTCUT_MAX);
        save(SHORTCUT_STORE, shortcuts);
        notify();
    }

    function removeShortcut(url) {
        shortcuts = shortcuts.filter(function (i) { return i.url !== url; });
        save(SHORTCUT_STORE, shortcuts);
        notify();
    }

    // ---------- Watch Later screen

    function renderLaterScreen() {
        var list = $('later-list');
        list.innerHTML = '';
        if (!later.length) {
            list.innerHTML = '<li class="later-empty">Nothing saved yet. Send a link from your phone and choose Watch later.</li>';
            return;
        }
        later.forEach(function (item) {
            var li = UI.el('li', 'later-item');
            li.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M8 5v14l11-7z"/></svg>';
            li.appendChild(UI.el('span', 'later-title', item.title));
            li._item = item;
            list.appendChild(li);
        });
    }

    function init() {
        later = load(LATER_STORE, LATER_MAX);
        shortcuts = load(SHORTCUT_STORE, SHORTCUT_MAX);

        UI.register('later', {
            el: $('later'),
            onShow: renderLaterScreen,
            rows: function () { return UI.children($('later-list')).map(function (li) { return [li]; }); },
            hints: [['OK', 'Open'], ['Y', 'Remove'], ['Back', 'Home']],
            activate: function (item) {
                removeLater(item.url);
                if (window.Share) Share.receive({ kind: 'share', url: item.url, title: item.title });
            },
            onKey: function (k) {
                // Yellow removes the focused item without opening it.
                if (k === KEY.YELLOW || k === 405) {
                    var cur = document.querySelector('#later-list .focused');
                    if (cur && cur._item) {
                        removeLater(cur._item.url);
                        renderLaterScreen();
                        UI.refresh();
                    }
                    return true;
                }
                return false;
            }
        });
    }

    window.PhoneBox = {
        init: init,
        later: function () { return later; },
        shortcuts: function () { return shortcuts; },
        addLater: addLater, removeLater: removeLater,
        addShortcut: addShortcut, removeShortcut: removeShortcut,
        onChange: function (fn) { listeners.push(fn); }
    };
})();
