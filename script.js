/* ---------------------------------------------------------------
   Reasons you should date me — scroll story behaviour
   --------------------------------------------------------------- */

(function () {
  "use strict";

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const panels = Array.from(document.querySelectorAll(".panel"));
  const dots = Array.from(document.querySelectorAll(".dots button"));

  /* ---------- image fallbacks ----------
     Assets/X.svg -> Assets/X.jpg -> an inline drawn heart, tried in order.
     This lives here rather than in an inline onerror so it also covers
     images that already failed before this file loaded. */

  const PLACEHOLDER =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E" +
    "%3Crect width='120' height='120' fill='%23fffdfa'/%3E" +
    "%3Cpath d='M60 92C44 81 30 70 30 56a16 16 0 0 1 30-7 16 16 0 0 1 30 7c0 14-14 25-30 36Z' " +
    "fill='none' stroke='%23ff7d98' stroke-width='4' stroke-linejoin='round'/%3E%3C/svg%3E";

  Array.prototype.forEach.call(document.querySelectorAll(".photo"), function (img) {
    const chain = (img.getAttribute("data-fallback") || "").split(/\s+/).filter(Boolean);
    let next = 0;
    let spent = false;

    function step() {
      if (spent) return;
      if (next < chain.length) {
        img.src = chain[next++];
        return;
      }
      spent = true;
      img.src = PLACEHOLDER;
      img.classList.add("is-missing");
    }

    img.addEventListener("error", step);

    // the error may have fired before this script ran
    if (img.complete && img.naturalWidth === 0) step();
  });

  /* ---------- split headings / lines into revealed words ---------- */

  function splitWords(el) {
    const text = el.textContent.replace(/\s+/g, " ").trim();
    if (!text) return;

    const frag = document.createDocumentFragment();
    text.split(" ").forEach(function (word, i) {
      const mask = document.createElement("span");
      mask.className = "w";

      const inner = document.createElement("span");
      inner.textContent = word;
      inner.style.setProperty("--i", String(i));

      mask.appendChild(inner);
      frag.appendChild(mask);
      frag.appendChild(document.createTextNode(" "));
    });

    el.textContent = "";
    el.appendChild(frag);
    el.classList.add("is-split");
  }

  document.querySelectorAll(".reveal-words").forEach(splitWords);

  /* ---------- scroll reveals ---------- */

  function setActive(panel) {
    dots.forEach(function (dot) {
      const isActive = dot.dataset.target === panel.id;
      if (isActive) {
        dot.setAttribute("aria-current", "true");
      } else {
        dot.removeAttribute("aria-current");
      }
    });
  }

  const ratios = new Map();
  let burstDone = false;

  const observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        ratios.set(entry.target, entry.intersectionRatio);
        // reveal once the panel is meaningfully on screen
        if (entry.intersectionRatio > 0.35) {
          entry.target.classList.add("is-visible");
        }
      });

      let best = null;
      let bestRatio = 0;
      ratios.forEach(function (ratio, el) {
        if (ratio > bestRatio) {
          bestRatio = ratio;
          best = el;
        }
      });

      if (best && bestRatio > 0.35) {
        setActive(best);
        if (best.id === "page-4" && !burstDone) {
          burstDone = true;
          heartBurst(best);
        }
        // the question is on screen: fetch the two popup drawings now, so the
        // card opens with its picture already decoded
        if (best.id === "page-7") warmPopupArt();
      }
    },
    { threshold: [0, 0.2, 0.35, 0.5, 0.75, 1] }
  );

  panels.forEach(function (panel) {
    observer.observe(panel);
  });

  /* the first panel is already on screen: re-arm it so it still plays
     its entrance once the words have been split */
  const firstPanel = document.getElementById("page-1");
  if (firstPanel && !reducedMotion) {
    firstPanel.classList.remove("is-visible");
    void firstPanel.offsetWidth; // flush styles so the transition fires
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        firstPanel.classList.add("is-visible");
      });
    });
  }

  /* ---------- dots navigation ---------- */

  dots.forEach(function (dot) {
    dot.addEventListener("click", function () {
      const target = document.getElementById(dot.dataset.target);
      if (target) target.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
    });
  });

  /* ---------- arrow key paging ---------- */

  document.addEventListener("keydown", function (event) {
    if (!["ArrowDown", "ArrowUp", "PageDown", "PageUp"].includes(event.key)) return;
    if (event.metaKey || event.ctrlKey || event.altKey) return;

    const current = activePanel();
    if (!current) return;

    const index = panels.indexOf(current);
    const forward = event.key === "ArrowDown" || event.key === "PageDown";
    const next = panels[index + (forward ? 1 : -1)];
    if (!next) return;

    event.preventDefault();
    next.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
  });

  function activePanel() {
    let best = null;
    let bestRatio = 0;
    ratios.forEach(function (ratio, el) {
      if (ratio > bestRatio) {
        bestRatio = ratio;
        best = el;
      }
    });
    return best;
  }

  /* ---------- gentle parallax lift on the photo cards ---------- */

  let ticking = false;

  function parallax() {
    ticking = false;
    const vh = window.innerHeight || 1;

    panels.forEach(function (panel) {
      const frame = panel.querySelector(".frame");
      if (!frame) return;

      const rect = panel.getBoundingClientRect();
      if (rect.bottom < -80 || rect.top > vh + 80) return;

      const offset = (rect.top + rect.height / 2 - vh / 2) / vh; // ~ -1 .. 1
      frame.style.setProperty("--lift", (offset * -42).toFixed(2) + "px");
    });
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(parallax);
  }

  if (!reducedMotion) {
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    parallax();
  }

  /* ---------- floating background doodles ---------- */

  const floaters = document.querySelector(".floaters");
  if (floaters && !reducedMotion) {
    const glyphs = ["♥", "♡", "✦", "✿", "☆", "♥"];
    const count = window.innerWidth < 640 ? 10 : 16;

    for (let i = 0; i < count; i++) {
      const span = document.createElement("span");
      span.textContent = glyphs[Math.floor(Math.random() * glyphs.length)];
      span.style.left = (Math.random() * 100).toFixed(2) + "vw";
      span.style.fontSize = (9 + Math.random() * 12).toFixed(1) + "px";
      span.style.animationDuration = (16 + Math.random() * 18).toFixed(1) + "s";
      span.style.animationDelay = "-" + (Math.random() * 30).toFixed(1) + "s";
      floaters.appendChild(span);
    }
  }

  /* ---------- dev preview: reload when a file changes ---------- */

  const isDevHost = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) || /\.style\.dev$/.test(location.hostname);
  if (isDevHost && typeof fetch === "function") {
    let lastStamp = null;
    const timer = window.setInterval(function () {
      fetch("/__build", { cache: "no-store" })
        .then(function (res) {
          // a host that answers /__build with anything but 200 is not the dev
          // server (a deployed build served from localhost, say): stop asking
          if (!res.ok) {
            window.clearInterval(timer);
            return null;
          }
          return res.json();
        })
        .then(function (data) {
          if (!data || typeof data.mtime !== "number") return;
          if (lastStamp !== null && data.mtime !== lastStamp) location.reload();
          lastStamp = data.mtime;
        })
        .catch(function () { /* plain static host: no live reload */ });
    }, 1500);
  }

  /* ---------- tiny heart burst on the last page ---------- */

  function heartBurst(panel) {
    if (reducedMotion) return;

    for (let i = 0; i < 18; i++) {
      const heart = document.createElement("span");
      heart.className = "burst";
      heart.textContent = i % 4 === 0 ? "✦" : "♥";
      heart.setAttribute("aria-hidden", "true");
      heart.style.setProperty("--bx", (Math.random() * 46 - 23).toFixed(1) + "vw");
      heart.style.setProperty("--br", (Math.random() * 80 - 40).toFixed(0) + "deg");
      heart.style.left = (45 + Math.random() * 10).toFixed(1) + "%";
      heart.style.fontSize = (12 + Math.random() * 14).toFixed(0) + "px";
      heart.style.animationDelay = (Math.random() * 400).toFixed(0) + "ms";
      panel.appendChild(heart);
      window.setTimeout(function () {
        heart.remove();
      }, 3200);
    }
  }

  /* ---------- the question at the end ---------- */

  const noteEl = document.querySelector("[data-note]");
  const pageAnswers = Array.from(document.querySelectorAll(".answers .answer"));
  const page7 = document.getElementById("page-7");

  /* the popup card: one element, two states. "yes" shows Yes.svg, "no" shows
     No.svg plus a Yes button that lands in exactly the same place the real
     Yes button does. */

  const modal = document.getElementById("answer-modal");
  const modalArt = modal && modal.querySelector("[data-modal-art]");
  const modalText = modal && modal.querySelector("[data-modal-text]");
  const modalActions = modal && modal.querySelector("[data-modal-actions]");
  const modalYes = modal && modal.querySelector("[data-modal-yes]");
  const modalClose = modal && modal.querySelector(".modal-close");

  const POPUP = {
    yes: {
      art: "Assets/Yes.svg",
      alt: "A doodle couple hugging, both of them blushing",
      text: "Oh I lovee youu too shuttumaniii nee enne choose cheythuloo\uD83E\uDD79\uD83E\uDD0D"
    },
    no: {
      art: "Assets/No.svg",
      alt: "A doodle cat glaring with big watery eyes",
      text: "Yess click cheyy shuttuveeeyy\uD83D\uDD2A"
    }
  };

  const FOCUSABLE =
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

  let modalOpen = false;
  let lastFocus = null;
  let hideTimer = 0;
  let lockedScroll = 0;
  let artsWarmed = false;

  function warmPopupArt() {
    if (artsWarmed) return;
    artsWarmed = true;
    // ~1 MB each: fetch them once the question is on screen, not at the click
    Object.keys(POPUP).forEach(function (k) {
      const pre = new Image();
      pre.decoding = "async";
      pre.src = POPUP[k].art;
    });
  }

  function fillPopup(kind) {
    const copy = POPUP[kind];
    if (!copy || !modal) return;

    modal.dataset.state = kind;
    modalText.textContent = copy.text;
    modalArt.alt = copy.alt;

    if (modalArt.getAttribute("src") !== copy.art) {
      modalArt.src = copy.art;
    }

    // the sad card is the only one that offers a way out
    if (modalActions) modalActions.hidden = kind !== "no";
  }

  function openPopup(kind) {
    if (!modal) return;

    warmPopupArt();
    window.clearTimeout(hideTimer);
    fillPopup(kind);

    if (!modalOpen) {
      lastFocus = document.activeElement;
      lockedScroll = window.scrollY || window.pageYOffset || 0;
      modal.hidden = false;
      modalOpen = true;
      modal.setAttribute("aria-hidden", "false");
      document.documentElement.classList.add("is-locked");
      void modal.offsetWidth; // flush, so the entrance transition still runs
    }

    modal.classList.add("is-on");

    const target = kind === "no" && modalYes ? modalYes : modalClose;
    if (target) {
      try {
        target.focus({ preventScroll: true });
      } catch (err) {
        target.focus();
      }
    }
  }

  function closePopup() {
    if (!modal || !modalOpen) return;

    modalOpen = false;
    // the clip belongs to the card: closing it ends the sound, so a long
    // mp3 cannot keep playing after the message is gone
    silence();
    modal.classList.remove("is-on");
    modal.setAttribute("aria-hidden", "true");

    hideTimer = window.setTimeout(
      function () {
        modal.hidden = true;
        modal.removeAttribute("data-state");
        document.documentElement.classList.remove("is-locked");
        // the snap points are unchanged, so this just undoes the scroll lock
        window.scrollTo(0, lockedScroll);

        if (lastFocus && typeof lastFocus.focus === "function") {
          try {
            lastFocus.focus({ preventScroll: true });
          } catch (err) {
            lastFocus.focus();
          }
        }
      },
      reducedMotion ? 0 : 420
    );
  }

  if (modal) {
    Array.prototype.forEach.call(modal.querySelectorAll("[data-modal-close]"), function (el) {
      el.addEventListener("click", closePopup);
    });

    if (modalYes) {
      modalYes.addEventListener("click", function () {
        acceptYes();
      });
    }

    document.addEventListener("keydown", function (event) {
      if (!modalOpen) return;

      if (event.key === "Escape") {
        event.preventDefault();
        closePopup();
        return;
      }

      if (event.key !== "Tab") return;

      const items = Array.prototype.filter.call(
        modal.querySelectorAll(FOCUSABLE),
        function (el) {
          return !el.hidden && el.offsetParent !== null;
        }
      );
      if (!items.length) return;

      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && (active === first || !modal.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !modal.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    });
  }

  pageAnswers.forEach(function (button) {
    button.addEventListener("click", function () {
      pageAnswers.forEach(function (b) {
        b.classList.toggle("is-picked", b === button);
      });

      // both branches start with the sound: the clip has to begin on this
      // very click, and everything it needs was fetched at page load
      if (button.dataset.answer === "yes") {
        acceptYes();
      } else {
        decline();
      }
    });
  });

  function acceptYes() {
    silence("yes");
    playSound("yes");
    clearTears();
    celebrate();
    if (page7) heartBurst(page7);
    setNote("I knew it. Best decision you've made all week \u2665");
    openPopup("yes");
  }

  function decline() {
    silence("no");
    playSound("no");
    cry();
    setNote("\u2026okay. i'll be right here, watering the flowers with my tears");
    openPopup("no");
  }

  function setNote(text) {
    if (!noteEl) return;
    noteEl.textContent = text;
    noteEl.classList.add("is-on");
  }

  /* ---------- popper ---------- */

  function celebrate() {
    if (reducedMotion) return;

    const canvas = document.createElement("canvas");
    canvas.className = "confetti-canvas";
    canvas.setAttribute("aria-hidden", "true");
    document.body.appendChild(canvas);

    const ctx = canvas.getContext("2d");
    if (!ctx) { canvas.remove(); return; }

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;

    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const colors = ["#ff7d98", "#ffb08a", "#ffe9a8", "#fffdfa", "#ff5f7e", "#bfe3ff"];
    const pieces = [];

    function popper(x, y, angle, count, power) {
      for (let i = 0; i < count; i++) {
        const spread = (Math.random() - 0.5) * 0.9;
        const speed = power * (0.5 + Math.random() * 0.8);
        pieces.push({
          x: x,
          y: y,
          vx: Math.cos(angle + spread) * speed,
          vy: Math.sin(angle + spread) * speed,
          w: 5 + Math.random() * 7,
          h: 8 + Math.random() * 11,
          rot: Math.random() * Math.PI,
          vr: (Math.random() - 0.5) * 0.42,
          color: colors[Math.floor(Math.random() * colors.length)]
        });
      }
    }

    popper(w * 0.05, h + 12, -Math.PI / 2.9, 70, 19);
    popper(w * 0.95, h + 12, -Math.PI + Math.PI / 2.9, 70, 19);
    popper(w * 0.5, h * 0.6, -Math.PI / 2, 55, 13);

    const started = performance.now();

    function frame(now) {
      ctx.clearRect(0, 0, w, h);
      let alive = 0;

      for (let i = 0; i < pieces.length; i++) {
        const p = pieces[i];
        p.vy += 0.32;
        p.vx *= 0.994;
        p.vy *= 0.994;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        if (p.y > h + 70) continue;
        alive++;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = 0.95;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, Math.max(1.5, p.h * Math.abs(Math.cos(p.rot * 1.7))));
        ctx.restore();
      }

      if (alive > 0 && now - started < 7000) {
        window.requestAnimationFrame(frame);
      } else {
        canvas.remove();
      }
    }

    window.requestAnimationFrame(frame);
  }

  /* ---------- water works ---------- */

  let cryTimer = 0;

  // also used when the sad popup hands over to the happy one
  function clearTears() {
    window.clearTimeout(cryTimer);
    cryTimer = 0;
    document.body.classList.remove("is-crying");
    Array.prototype.forEach.call(document.querySelectorAll(".rain, .tears"), function (node) {
      node.remove();
    });
  }

  function cry() {
    if (reducedMotion) return;

    clearTears();

    const layer = document.createElement("div");
    layer.className = "rain";
    layer.setAttribute("aria-hidden", "true");

    const tint = document.createElement("div");
    tint.className = "tears";
    tint.setAttribute("aria-hidden", "true");

    document.body.appendChild(tint);
    document.body.appendChild(layer);
    document.body.classList.add("is-crying");
    window.requestAnimationFrame(function () { tint.classList.add("is-on"); });

    const count = window.innerWidth < 640 ? 30 : 56;

    for (let i = 0; i < count; i++) {
      const bead = Math.random() < 0.34;
      const drop = document.createElement("span");
      drop.className = "drop" + (bead ? " is-bead" : "");
      drop.style.left = (Math.random() * 100).toFixed(2) + "%";
      drop.style.height = (bead ? 7 : 40 + Math.random() * 90).toFixed(0) + "px";
      drop.style.setProperty("--drift", (Math.random() * 18 - 9).toFixed(0) + "px");
      drop.style.width = (2 + Math.random() * 2.4).toFixed(1) + "px";
      drop.style.opacity = (0.4 + Math.random() * 0.55).toFixed(2);
      drop.style.animationDuration = (bead ? 1.6 + Math.random() * 1.6 : 1.25 + Math.random() * 1.5).toFixed(2) + "s";
      // a negative delay drops each one in mid-fall, so the screen is
      // already covered in tears the instant the button is pressed
      drop.style.animationDelay = "-" + (Math.random() * 2.4).toFixed(2) + "s";
      layer.appendChild(drop);
    }

    cryTimer = window.setTimeout(function () {
      cryTimer = 0;
      tint.classList.remove("is-on");
      document.body.classList.remove("is-crying");
      window.setTimeout(function () {
        layer.remove();
        tint.remove();
      }, 1400);
    }, 6400);
  }

  /* ---------- sound effects ----------

     The clip has to start on the click itself, so nothing may be fetched,
     decoded or constructed at that moment. Both files are created with
     preload="auto" the moment this script runs — long before the question is
     reached — so a press only calls play().

     Assets/Yes.mp3 and Assets/No.mp3 are the real clips. If one is ever
     missing, the generated wav of the same mood (popper.wav / cry.wav) takes
     over through the element's own error event, so there is no probe request
     and nothing to wait for. */

  const SOUND = {
    yes: { file: "Assets/Yes.mp3", fallback: "popper.wav" },
    no: { file: "Assets/No.mp3", fallback: "cry.wav" }
  };

  // el = the element that is already fetching + decoding this clip
  Object.keys(SOUND).forEach(function (k) {
    SOUND[k].el = null;
    SOUND[k].touched = false;
  });

  function loadSound(cfg, src) {
    const el = new Audio();
    el.preload = "auto";
    el.volume = 0.95;
    el.addEventListener("error", function () {
      // only the primary file may fall back; a broken wav is simply silent
      if (src === cfg.file && cfg.fallback) loadSound(cfg, cfg.fallback);
    });
    el.src = src;
    el.load();
    cfg.el = el;
    return el;
  }

  function playSound(kind) {
    const cfg = SOUND[kind];
    if (!cfg) return;

    cfg.touched = true;
    const el = cfg.el || loadSound(cfg, cfg.file);

    try {
      el.currentTime = 0;
      const started = el.play();
      // a refused play() is not actionable here; the animation still runs
      if (started && typeof started.catch === "function") {
        started.catch(function () {});
      }
    } catch (err) {
      /* no audio support: leave it silent */
    }
  }

  // stop everything except the one that is starting, so saying yes after no
  // does not leave the sad clip playing under the happy one. Called with no
  // argument, it stops both — which is what closing the popup does.
  function silence(exceptKind) {
    Object.keys(SOUND).forEach(function (k) {
      if (k === exceptKind) return;
      const el = SOUND[k].el;
      if (!el) return;
      SOUND[k].touched = true;
      try {
        el.pause();
        el.currentTime = 0;
      } catch (err) {}
    });
  }

  // the first tap anywhere unlocks audio (iOS) and finishes decoding, so the
  // button press itself has nothing left to wait for
  function warmUpAudio() {
    document.removeEventListener("pointerdown", warmUpAudio, true);

    Object.keys(SOUND).forEach(function (k) {
      const cfg = SOUND[k];
      const el = cfg.el;
      if (!el) return;

      function settle() {
        // a real press landed while this was starting: leave it alone
        if (cfg.touched) return;
        try {
          el.pause();
          el.currentTime = 0;
        } catch (err) {}
        el.muted = false;
      }

      try {
        el.muted = true;
        const started = el.play();
        if (started && typeof started.then === "function") {
          started.then(settle).catch(function () {
            el.muted = false;
          });
        } else {
          settle();
        }
      } catch (err) {
        el.muted = false;
      }
    });
  }

  // start immediately: these are the two files the whole last page depends on
  Object.keys(SOUND).forEach(function (k) {
    loadSound(SOUND[k], SOUND[k].file);
  });

  document.addEventListener("pointerdown", warmUpAudio, true);
})();
