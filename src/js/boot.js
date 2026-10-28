/* Start-up order: UI core, Settings views, then Home (which shows itself). */
(function () {
    'use strict';

    function fitPreview() {
        if (!window.__TIZEN_MOCK__) return;
        document.documentElement.classList.add('preview');
        var scale = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
        document.getElementById('stage').style.transform = 'scale(' + scale + ')';
    }

    fitPreview();
    window.addEventListener('resize', fitPreview);

    UI.init();
    Settings.init();
    Screensaver.init();
    Weather.start();
    Search.init();
    Player.init();
    PhoneBox.init();
    Home.init();
    // Messages from the phone page.
    var NAV = { up: 38, down: 40, left: 37, right: 39, ok: 13, back: 10009 };
    PhoneLink.start(function (msg) {
        if (msg.kind === 'share') Share.receive(msg);
        else if (msg.kind === 'ctl') Player.control(msg.cmd);
        else if (msg.kind === 'nav') { if (NAV[msg.cmd] !== undefined) UI.injectKey(NAV[msg.cmd]); }
        else if (msg.kind === 'shortcut') { PhoneBox.addShortcut(msg.url, msg.title); UI.toast('Pinned to Home'); }
        else Search.fromPhone(msg);
    });

    // Preview only: open a screen directly, e.g. http://localhost:8080/#settings
    var view = location.hash.slice(1);
    if (window.__TIZEN_MOCK__ && view) {
        try {
            UI.show(view);
        } catch (e) {
            // Unknown screen name: stay on Home.
        }
    }
})();
