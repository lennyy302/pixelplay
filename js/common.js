/* ============================================================
   PixelPlay — shared helpers (storage, best scores, sound, input)
   ============================================================ */
(function () {
  "use strict";

  const PREFIX = "pixelplay:";

  /* ---------------- Local storage ---------------- */
  const Store = {
    get(key, fallback = null) {
      try {
        const raw = localStorage.getItem(PREFIX + key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch (err) {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(PREFIX + key, JSON.stringify(value));
      } catch (err) {
        /* storage can be blocked — games still work */
      }
    },
    remove(key) {
      try {
        localStorage.removeItem(PREFIX + key);
      } catch (err) {}
    },
  };

  /* ---------------- Best scores ---------------- */
  const Best = {
    get(game, mode = "high") {
      const value = Store.get("best:" + game, null);
      return typeof value === "number" && Number.isFinite(value) ? value : null;
    },
    set(game, value, mode = "high") {
      const current = this.get(game, mode);
      const better =
        current === null || (mode === "low" ? value < current : value > current);
      if (better) {
        Store.set("best:" + game, value);
        return true;
      }
      return false;
    },
    render() {
      document.querySelectorAll("[data-best]").forEach((el) => {
        const game = el.dataset.best;
        if (!game) return;
        const mode = el.dataset.bestMode || "high";
        const suffix = el.dataset.bestSuffix || "";
        const value = this.get(game, mode);
        if (value === null) {
          el.textContent = mode === "low" ? "—" : "0" + suffix;
        } else {
          el.textContent = value + suffix;
        }
      });
    },
  };

  /* ---------------- Sound ---------------- */
  const SFX = (() => {
    let ctx = null;
    let enabled = Store.get("sound", true);
    if (typeof enabled !== "boolean") enabled = true;

    function ensure() {
      if (!enabled) return null;
      try {
        if (!ctx) {
          const AC = window.AudioContext || window.webkitAudioContext;
          if (!AC) return null;
          ctx = new AC();
        }
        if (ctx.state === "suspended") ctx.resume();
        return ctx;
      } catch (err) {
        return null;
      }
    }

    function tone(freq = 440, duration = 0.08, type = "square", volume = 0.05, delay = 0) {
      if (!enabled) return;
      const c = ensure();
      if (!c) return;
      try {
        const t0 = c.currentTime + Math.max(0, delay);
        const osc = c.createOscillator();
        const gain = c.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, t0);
        gain.gain.setValueAtTime(0.0001, t0);
        gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), t0 + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
        osc.connect(gain);
        gain.connect(c.destination);
        osc.start(t0);
        osc.stop(t0 + duration + 0.03);
      } catch (err) {}
    }

    function notes(list) {
      // list: [freq, duration, delay]
      list.forEach(([f, d, t]) => tone(f, d || 0.08, "square", 0.045, t || 0));
    }

    function updateButtons() {
      document.querySelectorAll("[data-sound-toggle]").forEach((btn) => {
        btn.textContent = enabled ? "🔊" : "🔇";
        btn.setAttribute("aria-label", enabled ? "Mute sound" : "Enable sound");
        btn.setAttribute("title", enabled ? "Mute sound" : "Enable sound");
      });
    }

    function toggle() {
      enabled = !enabled;
      Store.set("sound", enabled);
      updateButtons();
      if (enabled) {
        ensure();
        tone(660, 0.06, "sine", 0.04);
      }
      return enabled;
    }

    function init() {
      updateButtons();
      document.querySelectorAll("[data-sound-toggle]").forEach((btn) => {
        if (btn.dataset.bound) return;
        btn.dataset.bound = "1";
        btn.addEventListener("click", toggle);
      });
      // Unlock audio on the first interaction (iOS requirement).
      const unlock = () => {
        if (enabled) ensure();
        window.removeEventListener("pointerdown", unlock);
        window.removeEventListener("keydown", unlock);
      };
      window.addEventListener("pointerdown", unlock, { passive: true });
      window.addEventListener("keydown", unlock);
    }

    return { tone, notes, toggle, init, get enabled() { return enabled; } };
  })();

  /* ---------------- Input helpers ---------------- */
  function onSwipe(el, callback, threshold = 22) {
    let startX = 0;
    let startY = 0;
    let tracking = false;

    el.addEventListener(
      "pointerdown",
      (e) => {
        if (e.pointerType === "mouse" && e.button !== 0) return;
        tracking = true;
        startX = e.clientX;
        startY = e.clientY;
      },
      { passive: true }
    );

    el.addEventListener(
      "pointerup",
      (e) => {
        if (!tracking) return;
        tracking = false;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        if (Math.hypot(dx, dy) < threshold) return;
        if (Math.abs(dx) > Math.abs(dy)) {
          callback(dx > 0 ? "right" : "left");
        } else {
          callback(dy > 0 ? "down" : "up");
        }
      },
      { passive: true }
    );

    el.addEventListener("pointercancel", () => {
      tracking = false;
    });
  }

  function onKeys(map, options = {}) {
    window.addEventListener("keydown", (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      const fn = map[key] || map[e.key];
      if (typeof fn !== "function") return;
      if (options.ignoreInputs !== false) {
        const tag = document.activeElement && document.activeElement.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      }
      e.preventDefault();
      fn(e);
    });
  }

  function bindHold(el, fn, delay = 160, interval = 65) {
    let timeout = null;
    let repeater = null;

    const stop = () => {
      clearTimeout(timeout);
      clearInterval(repeater);
      timeout = null;
      repeater = null;
      el.classList.remove("pressed");
    };

    el.addEventListener("pointerdown", (e) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      e.preventDefault();
      el.classList.add("pressed");
      try {
        el.setPointerCapture(e.pointerId);
      } catch (err) {}
      fn();
      clearTimeout(timeout);
      clearInterval(repeater);
      timeout = setTimeout(() => {
        repeater = setInterval(fn, interval);
      }, delay);
    });

    ["pointerup", "pointercancel", "pointerleave", "lostpointercapture"].forEach((ev) => {
      el.addEventListener(ev, stop);
    });
  }

  function clamp(value, min, max) {
    return value < min ? min : value > max ? max : value;
  }

  function rand(min, max) {
    return Math.random() * (max - min) + min;
  }

  function randInt(min, max) {
    return Math.floor(rand(min, max + 1));
  }

  function fmtTime(totalSeconds) {
    const s = Math.max(0, Math.floor(totalSeconds));
    return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
  }

  let toastTimer = null;
  function toast(message, duration = 1600) {
    let el = document.querySelector(".toast");
    if (!el) {
      el = document.createElement("div");
      el.className = "toast";
      document.body.appendChild(el);
    }
    el.textContent = message;
    requestAnimationFrame(() => el.classList.add("show"));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), duration);
  }

  function init() {
    Best.render();
    SFX.init();
    const year = document.getElementById("year");
    if (year) year.textContent = new Date().getFullYear();
  }

  window.Store = Store;
  window.Best = Best;
  window.SFX = SFX;
  window.onSwipe = onSwipe;
  window.onKeys = onKeys;
  window.bindHold = bindHold;
  window.clamp = clamp;
  window.rand = rand;
  window.randInt = randInt;
  window.fmtTime = fmtTime;
  window.toast = toast;
  window.PixelPlay = { Store, Best, SFX, onSwipe, onKeys, bindHold, clamp, rand, randInt, fmtTime, toast };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
