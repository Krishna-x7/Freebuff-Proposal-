/* ---------------------------------------------------------------
   Reasons you should date me — scroll story behaviour
   --------------------------------------------------------------- */

(function () {
  "use strict";

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const panels = Array.from(document.querySelectorAll(".panel"));
  const dots = Array.from(document.querySelectorAll(".dots button"));

  /* ---------- image fallbacks ----------
     N.svg -> N.jpg -> art/N.svg (a drawn stand-in), tried in order.
     This lives here rather than in an inline onerror so it also covers
     images that already failed before this file loaded. */

  Array.prototype.forEach.call(document.querySelectorAll(".photo"), function (img) {
    const chain = (img.getAttribute("data-fallback") || "").split(/\s+/).filter(Boolean);
    let next = 0;

    function step() {
      if (next >= chain.length) return;
      img.src = chain[next++];
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
    window.setInterval(function () {
      fetch("/__build", { cache: "no-store" })
        .then(function (res) { return res.ok ? res.json() : null; })
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
  const answerButtons = Array.from(document.querySelectorAll(".answer"));

  // a local mp3 dropped next to index.html always wins; otherwise the
  // YouTube clip is played through a hidden 1px embed
  const SOUND = {
    yes: { id: "8SoovMIylmA", file: "popper.mp3" },
    no: { id: "D32vImPoMZs", file: "cry.mp3" }
  };

  answerButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      const kind = button.dataset.answer;

      answerButtons.forEach(function (b) {
        b.classList.toggle("is-picked", b === button);
      });

      if (kind === "yes") {
        celebrate();
        const panel = document.getElementById("page-7");
        if (panel) heartBurst(panel);
        setNote("I knew it. Best decision you've made all week \u2665");
      } else {
        cry();
        setNote("\u2026okay. i'll be right here, watering the flowers with my tears");
      }

      playSound(kind);
    });
  });

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

  function cry() {
    if (reducedMotion) return;

    Array.prototype.forEach.call(document.querySelectorAll(".rain, .tears"), function (node) {
      node.remove();
    });

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

    window.setTimeout(function () {
      tint.classList.remove("is-on");
      document.body.classList.remove("is-crying");
      window.setTimeout(function () {
        layer.remove();
        tint.remove();
      }, 1400);
    }, 6400);
  }

  /* ---------- sound effects ---------- */

  function playSound(kind) {
    const cfg = SOUND[kind];
    if (!cfg) return;

    // check for an mp3 next to index.html first, so dropping one in is enough
    // to replace the YouTube clip; anything else falls through to the embed
    function fallback() {
      playFromYouTube(cfg.id);
    }

    if (typeof fetch !== "function") {
      fallback();
      return;
    }

    let played = false;

    fetch(cfg.file, { method: "HEAD", cache: "no-store" })
      .then(function (res) {
        if (!res.ok) throw new Error("no local file");
        const audio = new Audio(cfg.file);
        audio.volume = 0.9;
        const started = audio.play();
        if (!started) throw new Error("playback not supported");
        return started.then(function () { played = true; });
      })
      .catch(function () {
        if (!played) fallback();
      });
  }

  let youtubeFrame = null;

  function playFromYouTube(id) {
    if (youtubeFrame) youtubeFrame.remove();

    const frame = document.createElement("iframe");
    frame.className = "yt-sound";
    frame.setAttribute("title", "sound effect");
    frame.setAttribute("allow", "autoplay; encrypted-media; picture-in-picture");
    frame.setAttribute("allowfullscreen", "");
    frame.setAttribute("frameborder", "0");
    frame.src =
      "https://www.youtube.com/embed/" + id +
      "?autoplay=1&controls=0&modestbranding=1&rel=0&playsinline=1&iv_load_policy=3";

    document.body.appendChild(frame);
    youtubeFrame = frame;
  }
})();
