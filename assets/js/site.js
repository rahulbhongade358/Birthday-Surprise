/* ==========================================================
   Birthday journey: shared script
   - starfield
   - background music (autoplay, remembered across pages)
   - modal helper
   ========================================================== */
(function () {
  'use strict';

  /* ---------- Helpers ---------- */
  function onActivate(el, fn) {
    if (!el) return;
    el.addEventListener('click', fn);
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        fn(e);
      }
    });
  }

  /* ---------- Starfield ---------- */
  function buildSky() {
    var sky = document.getElementById('sky');
    if (!sky) return;
    var small = window.matchMedia('(max-width: 600px)').matches;
    var count = small ? 45 : 90;
    var frag = document.createDocumentFragment();
    for (var i = 0; i < count; i++) {
      var s = document.createElement('span');
      var glyph = Math.random() > 0.82;
      s.className = 'star' + (glyph ? '' : ' dot');
      if (glyph) {
        s.textContent = '✦';
        s.style.fontSize = (Math.random() * 9 + 6) + 'px';
      }
      s.style.left = Math.random() * 100 + '%';
      s.style.top = Math.random() * 100 + '%';
      s.style.animationDelay = Math.random() * 4 + 's';
      s.style.animationDuration = 2 + Math.random() * 3 + 's';
      frag.appendChild(s);
    }
    sky.appendChild(frag);
  }

  /* ---------- Modal ---------- */
  var Modal = {
    el: null,
    last: null,
    onClose: null,
    init: function () {
      var m = document.getElementById('modal');
      if (!m) return;
      this.el = m;
      var self = this;
      m.addEventListener('click', function (e) {
        if (e.target === m) self.close();
      });
      var closeBtn = m.querySelector('[data-modal-close]');
      if (closeBtn) closeBtn.addEventListener('click', function () { self.close(); });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && m.classList.contains('active')) self.close();
      });
    },
    open: function (icon, title, text, buttonLabel) {
      var m = this.el;
      if (!m) return;
      this.last = document.activeElement;
      m.querySelector('[data-modal-icon]').textContent = icon;
      m.querySelector('[data-modal-title]').textContent = title;
      m.querySelector('[data-modal-text]').textContent = text;
      var closeBtn = m.querySelector('[data-modal-close]');
      if (buttonLabel) closeBtn.textContent = buttonLabel;
      m.classList.add('active');
      m.setAttribute('aria-hidden', 'false');
      document.body.classList.add('modal-open');
      setTimeout(function () {
        try { closeBtn.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
      }, 60);
    },
    close: function () {
      var m = this.el;
      if (!m || !m.classList.contains('active')) return;
      m.classList.remove('active');
      m.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('modal-open');
      if (this.last && this.last.focus) {
        try { this.last.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
      }
      if (typeof this.onClose === 'function') this.onClose();
    }
  };

  /* ---------- Background music ---------- */
  function initMusic() {
    var SRC = 'assets/audio/birthday-music.mp3';
    var KEY = 'bdayMusicState';
    var saved = { muted: false, time: 0 };

    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        var o = JSON.parse(raw);
        if (o && typeof o === 'object') {
          saved.muted = !!o.muted;
          saved.time = +o.time || 0;
        }
      }
    } catch (e) { /* storage unavailable */ }

    var muted = saved.muted;
    var broken = false;
    var pending = false;

    var audio = new Audio();
    audio.src = SRC;
    audio.loop = true;
    audio.preload = 'auto';
    audio.volume = 0.4;

    /* Floating button */
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'music-btn';
    btn.innerHTML =
      '<span class="eq" aria-hidden="true"><i></i><i></i><i></i><i></i></span>' +
      '<span class="label">Music</span>';
    document.body.appendChild(btn);
    var label = btn.querySelector('.label');

    function ui(mode) {
      btn.classList.toggle('playing', mode === 'on');
      btn.classList.toggle('waiting', mode === 'wait');
      btn.setAttribute('aria-pressed', mode === 'on' ? 'true' : 'false');
      btn.setAttribute('aria-label', mode === 'on' ? 'Pause background music' : 'Play background music');
      label.textContent = mode === 'on' ? 'Music on' : mode === 'wait' ? 'Tap to play' : 'Music off';
    }

    function save() {
      try {
        localStorage.setItem(KEY, JSON.stringify({ muted: muted, time: audio.currentTime || 0 }));
      } catch (e) { /* ignore */ }
    }

    /* Resume where the previous page stopped */
    var restored = false;
    audio.addEventListener('loadedmetadata', function () {
      if (restored) return;
      restored = true;
      if (saved.time > 0 && isFinite(audio.duration) && saved.time < audio.duration - 1) {
        try { audio.currentTime = saved.time; } catch (e) { /* ignore */ }
      }
    });

    audio.addEventListener('error', function () {
      broken = true;
      unbind();
      btn.classList.remove('playing', 'waiting');
      btn.classList.add('unavailable');
      label.textContent = 'Music unavailable';
      btn.title = 'Add your song at ' + SRC;
      if (window.console) console.warn('Background music file not found: ' + SRC);
    });

    /* Autoplay: try now; if the browser blocks it, start on first touch/click/key */
    var events = ['pointerdown', 'touchstart', 'keydown', 'click'];
    var bound = false;

    function onGesture(e) {
      if (muted || broken) return;
      if (e.target && e.target.closest && e.target.closest('.music-btn')) return;
      if (!audio.paused) { unbind(); return; }
      attempt();
    }

    function bind() {
      if (bound) return;
      bound = true;
      events.forEach(function (n) { document.addEventListener(n, onGesture, true); });
    }

    function unbind() {
      if (!bound) return;
      bound = false;
      events.forEach(function (n) { document.removeEventListener(n, onGesture, true); });
    }

    function attempt() {
      if (pending || broken || muted) return;
      var p;
      try { p = audio.play(); } catch (e) { p = null; }
      if (p && typeof p.then === 'function') {
        pending = true;
        p.then(function () {
          pending = false;
          ui('on');
          unbind();
        }, function () {
          pending = false;
          if (!muted && !broken) { ui('wait'); bind(); }
        });
      }
    }

    /* Manual toggle */
    btn.addEventListener('click', function () {
      if (broken) return;
      if (audio.paused) {
        muted = false;
        var p;
        try { p = audio.play(); } catch (e) { p = null; }
        if (p && typeof p.then === 'function') {
          p.then(function () { ui('on'); unbind(); }, function () { ui('off'); });
        }
      } else {
        muted = true;
        audio.pause();
        ui('off');
      }
      save();
    });

    /* Remember position for the next page */
    setInterval(function () { if (!audio.paused) save(); }, 1000);
    window.addEventListener('pagehide', save);
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') save();
    });

    ui('off');
    if (!muted) attempt();
  }

  /* ---------- Boot ---------- */
  window.Site = { onActivate: onActivate, Modal: Modal };

  buildSky();
  Modal.init();
  initMusic();
})();
