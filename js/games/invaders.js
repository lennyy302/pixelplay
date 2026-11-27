/* PixelPlay — Invaders */
(function () {
  "use strict";

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;

  const scoreEl = document.getElementById("score");
  const livesEl = document.getElementById("lives");
  const waveEl = document.getElementById("wave");
  const bestEl = document.getElementById("best");
  const pauseBtn = document.getElementById("pauseBtn");
  const overlay = document.getElementById("overlay");
  const ovIcon = document.getElementById("ovIcon");
  const ovTitle = document.getElementById("ovTitle");
  const ovText = document.getElementById("ovText");
  const ovBtn = document.getElementById("ovBtn");

  const PLAYER_W = 44;
  const PLAYER_H = 26;
  const PLAYER_Y = H - 64;
  const ROWS = 5;
  const COLS = 8;
  const ENEMY_W = 34;
  const ENEMY_H = 26;
  const GAP_X = 12;
  const GAP_Y = 14;
  const START_X = (W - (COLS * ENEMY_W + (COLS - 1) * GAP_X)) / 2;
  const START_Y = 74;

  const ROW_SCORE = [30, 20, 20, 10, 10];
  const ROW_COLOR = ["#f472b6", "#c084fc", "#a78bfa", "#22d3ee", "#4ade80"];

  let player = { x: W / 2 - PLAYER_W / 2 };
  let enemies = [];
  let playerBullets = [];
  let enemyBullets = [];
  let stars = [];
  let particles = [];
  let score = 0;
  let lives = 3;
  let wave = 1;
  let best = Best.get("invaders") || 0;
  let state = "ready";
  let formationDir = 1;
  let enemySpeed = 38;
  let shootTimer = 0.7;
  let fireCooldown = 0;
  let invuln = 0;
  let lastTime = 0;
  let keys = { left: false, right: false, fire: false };

  for (let i = 0; i < 70; i++) {
    stars.push({
      x: Math.random() * W,
      y: Math.random() * H,
      s: rand(0.5, 1.8),
      a: rand(0.15, 0.7),
      tw: rand(0.5, 2),
    });
  }

  function spawnWave() {
    enemies = [];
    formationDir = 1;
    enemySpeed = Math.min(95, 34 + wave * 8);
    shootTimer = Math.max(0.35, 0.9 - wave * 0.06);
    const y0 = START_Y + Math.min(56, (wave - 1) * 9);
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        enemies.push({
          x: START_X + c * (ENEMY_W + GAP_X),
          y: y0 + r * (ENEMY_H + GAP_Y),
          w: ENEMY_W,
          h: ENEMY_H,
          row: r,
          col: c,
          alive: true,
        });
      }
    }
    playerBullets = [];
    enemyBullets = [];
  }

  function updateHud() {
    scoreEl.textContent = score;
    livesEl.textContent = "♥".repeat(Math.max(0, lives)) || "—";
    waveEl.textContent = wave;
    bestEl.textContent = Math.max(best, score);
  }

  function showOverlay(icon, title, text, button) {
    ovIcon.textContent = icon;
    ovTitle.textContent = title;
    ovText.innerHTML = text;
    ovBtn.textContent = button;
    overlay.classList.remove("hidden");
  }

  function start() {
    score = 0;
    lives = 3;
    wave = 1;
    invuln = 0;
    fireCooldown = 0;
    player.x = W / 2 - PLAYER_W / 2;
    particles = [];
    spawnWave();
    updateHud();
    state = "playing";
    pauseBtn.textContent = "⏸ Pause";
    overlay.classList.add("hidden");
    SFX.tone(440, 0.06, "sine", 0.04);
    SFX.tone(660, 0.08, "sine", 0.04, 0.07);
  }

  function gameOver() {
    state = "over";
    const isBest = Best.set("invaders", score);
    if (isBest) best = score;
    Best.render();
    updateHud();
    SFX.tone(180, 0.2, "sawtooth", 0.05);
    SFX.tone(110, 0.34, "sawtooth", 0.05, 0.16);
    showOverlay(
      isBest ? "🏆" : "💥",
      isBest ? "New best!" : "The planet has fallen",
      `Score <b>${score}</b> · reached wave <b>${wave}</b>${isBest ? "<br>A new personal best!" : "."}`,
      "Play again"
    );
  }

  function pause() {
    if (state !== "playing") return;
    keys.left = false;
    keys.right = false;
    keys.fire = false;
    state = "paused";
    pauseBtn.textContent = "▶ Resume";
    showOverlay("⏸️", "Paused", "The invaders are politely waiting.", "Resume");
  }

  function resume() {
    if (state !== "paused") return;
    state = "playing";
    pauseBtn.textContent = "⏸ Pause";
    overlay.classList.add("hidden");
    lastTime = 0;
  }

  function fire() {
    if (state !== "playing" || fireCooldown > 0) return;
    if (playerBullets.length >= 3) return;
    playerBullets.push({ x: player.x + PLAYER_W / 2 - 2, y: PLAYER_Y - 8, w: 4, h: 12, vy: -560 });
    fireCooldown = 0.2;
    SFX.tone(900, 0.04, "square", 0.025);
  }

  function hitPlayer() {
    if (invuln > 0) return;
    lives--;
    invuln = 1.6;
    enemyBullets = [];
    player.x = W / 2 - PLAYER_W / 2;
    updateHud();
    SFX.tone(160, 0.18, "sawtooth", 0.05);
    if (lives <= 0) {
      gameOver();
    } else {
      toast(lives === 1 ? "Last life!" : lives + " lives left");
    }
  }

  function burst(x, y, color) {
    for (let i = 0; i < 10; i++) {
      const a = rand(0, Math.PI * 2);
      particles.push({
        x,
        y,
        vx: Math.cos(a) * rand(30, 150),
        vy: Math.sin(a) * rand(30, 150),
        life: 1,
        color,
      });
    }
  }

  function update(dt) {
    fireCooldown = Math.max(0, fireCooldown - dt);
    invuln = Math.max(0, invuln - dt);

    // Player movement
    const move = 330 * dt;
    if (keys.left) player.x -= move;
    if (keys.right) player.x += move;
    player.x = clamp(player.x, 8, W - PLAYER_W - 8);

    if (keys.fire) fire();

    // Enemy formation
    const alive = enemies.filter((e) => e.alive);
    if (!alive.length) {
      wave++;
      score += 100;
      updateHud();
      toast("Wave " + wave);
      SFX.notes([
        [523, 0.08, 0],
        [659, 0.08, 0.08],
        [784, 0.08, 0.16],
        [1046, 0.14, 0.24],
      ]);
      spawnWave();
      return;
    }

    let minX = Infinity;
    let maxX = -Infinity;
    alive.forEach((e) => {
      minX = Math.min(minX, e.x);
      maxX = Math.max(maxX, e.x + e.w);
    });

    const step = formationDir * enemySpeed * dt;
    if (maxX + step > W - 16 || minX + step < 16) {
      formationDir *= -1;
      alive.forEach((e) => (e.y += 16));
      if (alive.some((e) => e.y + e.h >= PLAYER_Y - 6)) {
        gameOver();
        return;
      }
    } else {
      alive.forEach((e) => (e.x += step));
    }

    // Enemy fire
    shootTimer -= dt;
    if (shootTimer <= 0) {
      const shooter = alive[Math.floor(Math.random() * alive.length)];
      if (shooter) {
        enemyBullets.push({
          x: shooter.x + shooter.w / 2 - 2,
          y: shooter.y + shooter.h,
          w: 4,
          h: 12,
          vy: 200 + wave * 8,
        });
        SFX.tone(240, 0.04, "square", 0.02);
      }
      shootTimer = Math.max(0.28, 0.95 - wave * 0.06) * rand(0.7, 1.2);
    }

    // Player bullets
    playerBullets.forEach((b) => (b.y += b.vy * dt));
    playerBullets = playerBullets.filter((b) => b.y + b.h > -10);

    for (const b of playerBullets) {
      for (const e of enemies) {
        if (!e.alive) continue;
        if (b.x < e.x + e.w && b.x + b.w > e.x && b.y < e.y + e.h && b.y + b.h > e.y) {
          e.alive = false;
          b.dead = true;
          score += ROW_SCORE[e.row];
          updateHud();
          burst(e.x + e.w / 2, e.y + e.h / 2, ROW_COLOR[e.row]);
          SFX.tone(520 + e.row * 80, 0.06, "square", 0.03);
          break;
        }
      }
    }
    playerBullets = playerBullets.filter((b) => !b.dead);

    // Enemy bullets
    enemyBullets.forEach((b) => (b.y += b.vy * dt));
    enemyBullets = enemyBullets.filter((b) => b.y < H + 20);

    for (const b of enemyBullets) {
      if (
        b.x < player.x + PLAYER_W - 6 &&
        b.x + b.w > player.x + 6 &&
        b.y < PLAYER_Y + PLAYER_H - 4 &&
        b.y + b.h > PLAYER_Y + 4
      ) {
        b.dead = true;
        hitPlayer();
        break;
      }
    }
    enemyBullets = enemyBullets.filter((b) => !b.dead);

    // Particles
    particles = particles.filter((p) => p.life > 0);
    particles.forEach((p) => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.97;
      p.vy *= 0.97;
      p.life -= dt * 1.8;
    });
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

  function drawPlayer() {
    if (invuln > 0 && Math.floor(performance.now() / 90) % 2 === 0) return;
    const x = player.x;
    const y = PLAYER_Y;

    ctx.save();
    ctx.shadowColor = "rgba(34,211,238,0.75)";
    ctx.shadowBlur = 16;
    ctx.fillStyle = "#22d3ee";
    ctx.beginPath();
    ctx.moveTo(x + PLAYER_W / 2, y);
    ctx.lineTo(x + PLAYER_W - 4, y + PLAYER_H);
    ctx.lineTo(x + PLAYER_W / 2 + 8, y + PLAYER_H - 6);
    ctx.lineTo(x + PLAYER_W / 2, y + PLAYER_H);
    ctx.lineTo(x + PLAYER_W / 2 - 8, y + PLAYER_H - 6);
    ctx.lineTo(x + 4, y + PLAYER_H);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#a5f3fc";
    ctx.beginPath();
    ctx.moveTo(x + PLAYER_W / 2, y + 3);
    ctx.lineTo(x + PLAYER_W / 2 + 6, y + 17);
    ctx.lineTo(x + PLAYER_W / 2 - 6, y + 17);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Engine flame
    const flicker = rand(6, 14);
    ctx.fillStyle = "rgba(251,146,60,0.85)";
    ctx.beginPath();
    ctx.moveTo(x + PLAYER_W / 2 - 6, y + PLAYER_H);
    ctx.lineTo(x + PLAYER_W / 2, y + PLAYER_H + flicker);
    ctx.lineTo(x + PLAYER_W / 2 + 6, y + PLAYER_H);
    ctx.closePath();
    ctx.fill();
  }

  function draw() {
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#070b18");
    bg.addColorStop(0.65, "#0b1226");
    bg.addColorStop(1, "#111a33");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    const t = performance.now() / 1000;
    stars.forEach((s) => {
      ctx.globalAlpha = s.a * (0.6 + Math.sin(t * s.tw + s.x) * 0.4);
      ctx.fillStyle = "#e2e8f0";
      ctx.fillRect(s.x, s.y, s.s, s.s);
    });
    ctx.globalAlpha = 1;

    // Enemies
    enemies.forEach((e) => {
      if (!e.alive) return;
      ctx.save();
      ctx.shadowColor = ROW_COLOR[e.row];
      ctx.shadowBlur = 10;
      ctx.fillStyle = "rgba(255,255,255,0.07)";
      rr(e.x, e.y, e.w, e.h, 7);
      ctx.fill();
      ctx.restore();
      ctx.font = "24px serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("👾", e.x + e.w / 2, e.y + e.h / 2 + 1);
      ctx.textBaseline = "alphabetic";
    });

    // Player bullets
    playerBullets.forEach((b) => {
      ctx.save();
      ctx.shadowColor = "#22d3ee";
      ctx.shadowBlur = 10;
      ctx.fillStyle = "#a5f3fc";
      rr(b.x, b.y, b.w, b.h, 2);
      ctx.fill();
      ctx.restore();
    });

    // Enemy bullets
    enemyBullets.forEach((b) => {
      ctx.save();
      ctx.shadowColor = "#fb7185";
      ctx.shadowBlur = 10;
      ctx.fillStyle = "#fda4af";
      rr(b.x, b.y, b.w, b.h, 2);
      ctx.fill();
      ctx.restore();
    });

    // Particles
    particles.forEach((p) => {
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
    });
    ctx.globalAlpha = 1;

    drawPlayer();

    if (state === "paused") {
      ctx.fillStyle = "rgba(7,11,24,0.4)";
      ctx.fillRect(0, 0, W, H);
    }
  }

  function loop(now) {
    const dt = Math.min(0.033, (now - (lastTime || now)) / 1000);
    lastTime = now;

    if (state === "playing") update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  /* ---------- input ---------- */
  function pointerX(e) {
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    player.x = clamp(x - PLAYER_W / 2, 8, W - PLAYER_W - 8);
  }

  canvas.addEventListener("pointermove", (e) => {
    if (state === "playing") pointerX(e);
  });
  canvas.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    if (state === "ready" || state === "over") start();
    else if (state === "playing") {
      pointerX(e);
      fire();
    }
  });

  onKeys({
    ArrowLeft: () => (keys.left = true),
    ArrowRight: () => (keys.right = true),
    a: () => (keys.left = true),
    d: () => (keys.right = true),
    " ": () => (keys.fire = true),
    Enter: () => {
      if (state === "ready" || state === "over") start();
      else if (state === "paused") resume();
    },
    p: () => (state === "playing" ? pause() : state === "paused" ? resume() : null),
  });

  window.addEventListener("keyup", (e) => {
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") keys.left = false;
    if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") keys.right = false;
    if (e.key === " ") keys.fire = false;
  });

  window.addEventListener("blur", () => {
    keys.left = false;
    keys.right = false;
    keys.fire = false;
  });

  // Touch buttons
  const leftBtn = document.querySelector('[data-move="left"]');
  const rightBtn = document.querySelector('[data-move="right"]');
  const fireBtn = document.getElementById("fireBtn");

  if (leftBtn && rightBtn) {
    [
      [leftBtn, "left"],
      [rightBtn, "right"],
    ].forEach(([btn, key]) => {
      btn.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        keys[key] = true;
        btn.classList.add("pressed");
      });
      ["pointerup", "pointercancel", "pointerleave", "lostpointercapture"].forEach((ev) =>
        btn.addEventListener(ev, () => {
          keys[key] = false;
          btn.classList.remove("pressed");
        })
      );
    });
  }

  if (fireBtn) {
    bindHold(fireBtn, fire, 100, 150);
  }

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
  spawnWave();
  player.x = W / 2 - PLAYER_W / 2;
  updateHud();
  draw();
  showOverlay(
    "👾",
    "Invaders",
    "Move with the mouse, drag, or <b>← →</b>. Fire with <b>Space</b>.<br>Clear every wave. Don't let them land.",
    "Play"
  );
  requestAnimationFrame(loop);
})();
