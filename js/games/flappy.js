/* PixelPlay — Flappy */
(function () {
  "use strict";

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;

  const scoreEl = document.getElementById("score");
  const bestEl = document.getElementById("best");
  const pauseBtn = document.getElementById("pauseBtn");
  const overlay = document.getElementById("overlay");
  const ovIcon = document.getElementById("ovIcon");
  const ovTitle = document.getElementById("ovTitle");
  const ovText = document.getElementById("ovText");
  const ovBtn = document.getElementById("ovBtn");

  const GROUND_H = 82;
  const PIPE_W = 68;
  const BIRD_X = 112;
  const BIRD_R = 14;
  const GRAVITY = 1500;
  const FLAP = -430;
  const MAX_FALL = 680;

  let bird = { x: BIRD_X, y: 280, vy: 0, rot: 0 };
  let pipes = [];
  let clouds = [];
  let score = 0;
  let best = Best.get("flappy") || 0;
  let speed = 168;
  let gap = 156;
  let groundOffset = 0;
  let state = "ready";
  let lastTime = 0;
  let spawnX = 0;
  let overTimer = null;

  for (let i = 0; i < 7; i++) {
    clouds.push({
      x: rand(0, W),
      y: rand(40, 300),
      s: rand(0.6, 1.5),
      a: rand(0.05, 0.14),
      v: rand(6, 18),
    });
  }

  function updateHud() {
    scoreEl.textContent = score;
    bestEl.textContent = Math.max(best, score);
  }

  function showOverlay(icon, title, text, button) {
    ovIcon.textContent = icon;
    ovTitle.textContent = title;
    ovText.innerHTML = text;
    ovBtn.textContent = button;
    overlay.classList.remove("hidden");
  }

  function reset() {
    bird = { x: BIRD_X, y: 280, vy: 0, rot: 0 };
    pipes = [];
    score = 0;
    speed = 168;
    gap = 156;
    groundOffset = 0;
    spawnX = W + 70;
    spawnPipe(spawnX);
    spawnX += 215;
    spawnPipe(spawnX);
    updateHud();
  }

  function spawnPipe(x) {
    const min = 78;
    const max = H - GROUND_H - gap - 78;
    pipes.push({ x, gapY: rand(min, Math.max(min + 10, max)), gap, scored: false });
  }

  function start() {
    clearTimeout(overTimer);
    reset();
    state = "playing";
    pauseBtn.textContent = "⏸ Pause";
    overlay.classList.add("hidden");
    bird.vy = FLAP;
    SFX.tone(520, 0.05, "sine", 0.04);
  }

  function flap() {
    if (state === "ready" || state === "over") {
      start();
      return;
    }
    if (state !== "playing") return;
    bird.vy = FLAP;
    SFX.tone(480, 0.05, "square", 0.035);
  }

  function gameOver() {
    if (state === "over") return;
    state = "over";
    const isBest = Best.set("flappy", score);
    if (isBest) best = score;
    Best.render();
    updateHud();
    SFX.tone(200, 0.14, "sawtooth", 0.05);
    SFX.tone(130, 0.28, "sawtooth", 0.05, 0.12);
    overTimer = setTimeout(() => {
      showOverlay(
        isBest ? "🏆" : "💥",
        isBest ? "New best!" : "Game over",
        `You cleared <b>${score}</b> pipe${score === 1 ? "" : "s"}${isBest ? " — a new personal best!" : "."}`,
        "Play again"
      );
    }, 380);
  }

  function pause() {
    if (state !== "playing") return;
    state = "paused";
    pauseBtn.textContent = "▶ Resume";
    showOverlay("⏸️", "Paused", "The pipes aren't going anywhere.", "Resume");
  }

  function resume() {
    if (state !== "paused") return;
    state = "playing";
    pauseBtn.textContent = "⏸ Pause";
    overlay.classList.add("hidden");
    lastTime = 0;
  }

  function hitPipe(p) {
    if (bird.x + BIRD_R < p.x || bird.x - BIRD_R > p.x + PIPE_W) return false;
    return bird.y - BIRD_R < p.gapY || bird.y + BIRD_R > p.gapY + p.gap;
  }

  function update(dt) {
    bird.vy = Math.min(MAX_FALL, bird.vy + GRAVITY * dt);
    bird.y += bird.vy * dt;
    bird.rot = clamp(bird.vy / 620, -0.5, 1.1);

    if (bird.y - BIRD_R < 0) {
      bird.y = BIRD_R;
      bird.vy = Math.max(0, bird.vy);
    }

    if (bird.y + BIRD_R >= H - GROUND_H) {
      bird.y = H - GROUND_H - BIRD_R;
      gameOver();
      return;
    }

    groundOffset = (groundOffset + speed * dt) % 36;

    pipes.forEach((p) => {
      p.x -= speed * dt;
      if (!p.scored && p.x + PIPE_W < bird.x - BIRD_R) {
        p.scored = true;
        score++;
        speed = Math.min(255, 168 + score * 4);
        gap = Math.max(132, 156 - score * 1.4);
        SFX.tone(760, 0.05, "square", 0.035);
        updateHud();
      }
      if (hitPipe(p)) {
        gameOver();
      }
    });

    pipes = pipes.filter((p) => p.x + PIPE_W > -40);

    const last = pipes[pipes.length - 1];
    if (!last || last.x < W - 215) {
      spawnPipe(W + 30);
    }
  }

  function rr(x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
    else {
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
    }
    ctx.closePath();
  }

  function drawPipe(p) {
    const topH = p.gapY;
    const bottomY = p.gapY + p.gap;

    const g = ctx.createLinearGradient(p.x, 0, p.x + PIPE_W, 0);
    g.addColorStop(0, "#0f766e");
    g.addColorStop(0.35, "#2dd4bf");
    g.addColorStop(0.7, "#14b8a6");
    g.addColorStop(1, "#0f766e");

    ctx.save();
    ctx.shadowColor = "rgba(45,212,191,0.28)";
    ctx.shadowBlur = 12;
    ctx.fillStyle = g;
    rr(p.x, 0, PIPE_W, topH, 8);
    ctx.fill();
    rr(p.x, bottomY, PIPE_W, H - GROUND_H - bottomY, 8);
    ctx.fill();
    ctx.restore();

    // Caps
    ctx.fillStyle = "#5eead4";
    rr(p.x - 5, topH - 22, PIPE_W + 10, 22, 6);
    ctx.fill();
    rr(p.x - 5, bottomY, PIPE_W + 10, 22, 6);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    rr(p.x + 4, 4, 8, Math.max(0, topH - 30), 4);
    ctx.fill();
    rr(p.x + 4, bottomY + 28, 8, Math.max(0, H - GROUND_H - bottomY - 34), 4);
    ctx.fill();
  }

  function drawBird() {
    ctx.save();
    ctx.translate(bird.x, bird.y);
    ctx.rotate(bird.rot);

    // Body
    ctx.save();
    ctx.shadowColor = "rgba(250,204,21,0.55)";
    ctx.shadowBlur = 16;
    ctx.fillStyle = "#facc15";
    ctx.beginPath();
    ctx.ellipse(0, 0, 16, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Belly
    ctx.fillStyle = "#fef3c7";
    ctx.beginPath();
    ctx.ellipse(1, 4, 10, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Wing
    const wing = Math.sin(performance.now() / 90) * 4;
    ctx.fillStyle = "#f59e0b";
    ctx.beginPath();
    ctx.ellipse(-4, 2 + wing, 8, 6, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // Eye
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(7, -5, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#111827";
    ctx.beginPath();
    ctx.arc(8.5, -5, 2.2, 0, Math.PI * 2);
    ctx.fill();

    // Beak
    ctx.fillStyle = "#fb923c";
    ctx.beginPath();
    ctx.moveTo(14, -1);
    ctx.lineTo(24, 2);
    ctx.lineTo(14, 6);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  function draw(now) {
    // Sky
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#0a1024");
    sky.addColorStop(0.55, "#12344a");
    sky.addColorStop(1, "#155e63");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    // Moon
    ctx.save();
    ctx.shadowColor = "rgba(226,232,240,0.6)";
    ctx.shadowBlur = 30;
    ctx.fillStyle = "#e2e8f0";
    ctx.beginPath();
    ctx.arc(W - 78, 82, 27, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = "rgba(148,163,184,0.25)";
    ctx.beginPath();
    ctx.arc(W - 88, 74, 6, 0, Math.PI * 2);
    ctx.arc(W - 70, 92, 4, 0, Math.PI * 2);
    ctx.fill();

    // Clouds
    clouds.forEach((c) => {
      c.x -= c.v * 0.016;
      if (c.x < -100) {
        c.x = W + 80;
        c.y = rand(40, 300);
      }
      ctx.fillStyle = `rgba(226,232,240,${c.a})`;
      ctx.beginPath();
      ctx.ellipse(c.x, c.y, 44 * c.s, 15 * c.s, 0, 0, Math.PI * 2);
      ctx.ellipse(c.x + 30 * c.s, c.y + 4, 30 * c.s, 12 * c.s, 0, 0, Math.PI * 2);
      ctx.ellipse(c.x - 30 * c.s, c.y + 5, 26 * c.s, 10 * c.s, 0, 0, Math.PI * 2);
      ctx.fill();
    });

    pipes.forEach(drawPipe);

    // Ground
    ctx.fillStyle = "#0b1a22";
    ctx.fillRect(0, H - GROUND_H, W, GROUND_H);
    ctx.fillStyle = "#134e4a";
    ctx.fillRect(0, H - GROUND_H, W, 10);
    ctx.fillStyle = "rgba(45,212,191,0.18)";
    for (let x = -36; x < W + 36; x += 36) {
      ctx.fillRect(x - groundOffset, H - GROUND_H + 16, 18, 5);
    }
    ctx.fillStyle = "rgba(255,255,255,0.04)";
    for (let x = -36; x < W + 36; x += 36) {
      ctx.fillRect(x - groundOffset + 18, H - GROUND_H + 34, 12, 4);
    }

    drawBird();

    // In-game score
    if (state === "playing" || state === "paused") {
      ctx.save();
      ctx.textAlign = "center";
      ctx.font = "800 54px Outfit, sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.shadowColor = "rgba(0,0,0,0.45)";
      ctx.shadowBlur = 12;
      ctx.fillText(String(score), W / 2, 92);
      ctx.restore();
    }

    if (state === "paused") {
      ctx.fillStyle = "rgba(7,11,24,0.35)";
      ctx.fillRect(0, 0, W, H);
    }
  }

  function loop(now) {
    const dt = Math.min(0.033, (now - (lastTime || now)) / 1000);
    lastTime = now;

    if (state === "playing") {
      update(dt);
    } else if (state === "ready") {
      bird.y = 280 + Math.sin(now / 360) * 9;
      bird.rot = 0;
    }

    draw(now);
    requestAnimationFrame(loop);
  }

  /* ---------- input ---------- */
  canvas.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    flap();
  });

  onKeys({
    " ": () => flap(),
    ArrowUp: () => flap(),
    w: () => flap(),
    Enter: () => {
      if (state === "ready" || state === "over") start();
      else if (state === "paused") resume();
    },
    p: () => (state === "playing" ? pause() : state === "paused" ? resume() : null),
  });

  pauseBtn.addEventListener("click", () => {
    if (state === "playing") pause();
    else if (state === "paused") resume();
  });

  ovBtn.addEventListener("click", () => {
    if (state === "paused") resume();
    else start();
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && state === "playing") pause();
  });

  /* ---------- go ---------- */
  reset();
  showOverlay("🐤", "Flappy", "Tap anywhere or press <b>Space</b> to flap.<br>Thread the pipes. Simple. Right?", "Play");
  requestAnimationFrame(loop);
})();
