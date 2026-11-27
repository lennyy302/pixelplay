/* PixelPlay — Breakout */
(function () {
  "use strict";

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;

  const scoreEl = document.getElementById("score");
  const livesEl = document.getElementById("lives");
  const levelEl = document.getElementById("level");
  const bestEl = document.getElementById("best");
  const pauseBtn = document.getElementById("pauseBtn");
  const overlay = document.getElementById("overlay");
  const ovIcon = document.getElementById("ovIcon");
  const ovTitle = document.getElementById("ovTitle");
  const ovText = document.getElementById("ovText");
  const ovBtn = document.getElementById("ovBtn");

  const PADDLE_W = 92;
  const PADDLE_H = 13;
  const PADDLE_Y = H - 36;
  const BALL_R = 7;
  const COLS = 8;
  const ROWS = 6;
  const BRICK_TOP = 74;
  const BRICK_GAP = 6;
  const SIDE = 22;
  const BRICK_W = (W - SIDE * 2 - BRICK_GAP * (COLS - 1)) / COLS;
  const BRICK_H = 20;
  const ROW_COLORS = ["#fb7185", "#fb923c", "#facc15", "#4ade80", "#22d3ee", "#a78bfa"];

  let paddle = { x: (W - PADDLE_W) / 2 };
  let ball = { x: W / 2, y: PADDLE_Y - BALL_R - 1, vx: 0, vy: 0, r: BALL_R };
  let bricks = [];
  let trail = [];
  let score = 0;
  let lives = 3;
  let level = 1;
  let best = Best.get("breakout") || 0;
  let speed = 320;
  let state = "ready"; // ready | serve | playing | paused | over
  let lastTime = 0;
  let keys = { left: false, right: false };

  function buildBricks() {
    bricks = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        bricks.push({
          x: SIDE + c * (BRICK_W + BRICK_GAP),
          y: BRICK_TOP + r * (BRICK_H + BRICK_GAP),
          w: BRICK_W,
          h: BRICK_H,
          color: ROW_COLORS[r % ROW_COLORS.length],
          alive: true,
        });
      }
    }
  }

  function updateHud() {
    scoreEl.textContent = score;
    livesEl.textContent = "♥".repeat(Math.max(0, lives)) || "—";
    levelEl.textContent = level;
    bestEl.textContent = Math.max(best, score);
  }

  function showOverlay(icon, title, text, button) {
    ovIcon.textContent = icon;
    ovTitle.textContent = title;
    ovText.innerHTML = text;
    ovBtn.textContent = button;
    overlay.classList.remove("hidden");
  }

  function hideOverlay() {
    overlay.classList.add("hidden");
  }

  function resetBall() {
    ball.x = paddle.x + PADDLE_W / 2;
    ball.y = PADDLE_Y - BALL_R - 1;
    ball.vx = 0;
    ball.vy = 0;
    trail = [];
  }

  function serve() {
    resetBall();
    state = "serve";
    pauseBtn.textContent = "⏸ Pause";
    hideOverlay();
  }

  function launch() {
    if (state !== "serve") return;
    const angle = rand(-Math.PI * 0.36, Math.PI * 0.36); // upward fan
    ball.vx = Math.sin(angle) * speed;
    ball.vy = -Math.cos(angle) * speed;
    state = "playing";
    SFX.tone(520, 0.05, "square", 0.04);
  }

  function start() {
    score = 0;
    lives = 3;
    level = 1;
    speed = 320;
    paddle.x = (W - PADDLE_W) / 2;
    buildBricks();
    updateHud();
    serve();
    SFX.tone(440, 0.06, "sine", 0.04);
    SFX.tone(660, 0.08, "sine", 0.04, 0.07);
  }

  function gameOver() {
    state = "over";
    const isBest = Best.set("breakout", score);
    if (isBest) best = score;
    Best.render();
    updateHud();
    SFX.tone(180, 0.2, "sawtooth", 0.05);
    SFX.tone(110, 0.32, "sawtooth", 0.05, 0.16);
    showOverlay(
      isBest ? "🏆" : "💥",
      isBest ? "New best!" : "Game over",
      `Score <b>${score}</b> · level ${level}${isBest ? "<br>A new personal best!" : ""}`,
      "Play again"
    );
  }

  function loseLife() {
    lives--;
    updateHud();
    SFX.tone(150, 0.22, "sawtooth", 0.05);
    if (lives <= 0) {
      gameOver();
      return;
    }
    toast(lives === 1 ? "Last life!" : lives + " lives left");
    serve();
  }

  function levelClear() {
    level++;
    speed = Math.min(560, 320 + (level - 1) * 28);
    score += 120;
    buildBricks();
    updateHud();
    toast("Level " + level + "!");
    SFX.notes([
      [523, 0.08, 0],
      [659, 0.08, 0.08],
      [784, 0.08, 0.16],
      [1046, 0.12, 0.24],
    ]);
    serve();
  }

  function pause() {
    if (state !== "playing" && state !== "serve") return;
    keys.left = false;
    keys.right = false;
    state = "paused";
    pauseBtn.textContent = "▶ Resume";
    showOverlay("⏸️", "Paused", "Stretch those paddle fingers.", "Resume");
  }

  function resume() {
    if (state !== "paused") return;
    state = ball.vx === 0 && ball.vy === 0 ? "serve" : "playing";
    pauseBtn.textContent = "⏸ Pause";
    hideOverlay();
  }

  function reflectBrick(b) {
    const cx = clamp(ball.x, b.x, b.x + b.w);
    const cy = clamp(ball.y, b.y, b.y + b.h);
    const dx = ball.x - cx;
    const dy = ball.y - cy;
    if (dx * dx + dy * dy > ball.r * ball.r) return false;

    const bcx = b.x + b.w / 2;
    const bcy = b.y + b.h / 2;
    const overlapX = ball.r + b.w / 2 - Math.abs(ball.x - bcx);
    const overlapY = ball.r + b.h / 2 - Math.abs(ball.y - bcy);

    if (overlapX < overlapY) {
      ball.vx = Math.abs(ball.vx) * (ball.x < bcx ? -1 : 1);
      ball.x += ball.x < bcx ? -overlapX : overlapX;
    } else {
      ball.vy = Math.abs(ball.vy) * (ball.y < bcy ? -1 : 1);
      ball.y += ball.y < bcy ? -overlapY : overlapY;
    }

    b.alive = false;
    score += 10 * level;
    updateHud();
    SFX.tone(620 + Math.random() * 240, 0.04, "square", 0.03);
    burst(b.x + b.w / 2, b.y + b.h / 2, b.color);
    return true;
  }

  let particles = [];
  function burst(x, y, color) {
    for (let i = 0; i < 6; i++) {
      const a = rand(0, Math.PI * 2);
      particles.push({
        x,
        y,
        vx: Math.cos(a) * rand(20, 90),
        vy: Math.sin(a) * rand(20, 90),
        life: 1,
        color,
      });
    }
  }

  function updateBall(dt) {
    const distance = Math.hypot(ball.vx, ball.vy) * dt;
    const steps = Math.max(1, Math.ceil(distance / 5));
    const sdt = dt / steps;

    for (let s = 0; s < steps; s++) {
      if (state !== "playing") return;

      ball.x += ball.vx * sdt;
      ball.y += ball.vy * sdt;

      // Walls
      if (ball.x - ball.r < 0) {
        ball.x = ball.r;
        ball.vx = Math.abs(ball.vx);
        SFX.tone(360, 0.025, "square", 0.02);
      } else if (ball.x + ball.r > W) {
        ball.x = W - ball.r;
        ball.vx = -Math.abs(ball.vx);
        SFX.tone(360, 0.025, "square", 0.02);
      }
      if (ball.y - ball.r < 0) {
        ball.y = ball.r;
        ball.vy = Math.abs(ball.vy);
        SFX.tone(360, 0.025, "square", 0.02);
      }

      // Paddle
      if (
        ball.vy > 0 &&
        ball.y + ball.r >= PADDLE_Y &&
        ball.y - ball.r <= PADDLE_Y + PADDLE_H &&
        ball.x >= paddle.x - ball.r &&
        ball.x <= paddle.x + PADDLE_W + ball.r
      ) {
        const hit = clamp((ball.x - (paddle.x + PADDLE_W / 2)) / (PADDLE_W / 2), -1, 1);
        const angle = hit * (Math.PI / 3);
        speed = Math.min(600, speed * 1.012);
        ball.vx = Math.sin(angle) * speed;
        ball.vy = -Math.cos(angle) * speed;
        ball.y = PADDLE_Y - ball.r - 0.5;
        SFX.tone(300 + Math.abs(hit) * 220, 0.04, "square", 0.04);
      }

      // Bricks
      for (const b of bricks) {
        if (b.alive && reflectBrick(b)) break;
      }

      // Fell past the paddle
      if (ball.y - ball.r > H) {
        loseLife();
        return;
      }
    }

    trail.push({ x: ball.x, y: ball.y });
    if (trail.length > 9) trail.shift();

    if (bricks.every((b) => !b.alive)) {
      levelClear();
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

  function draw() {
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#0b1226");
    bg.addColorStop(1, "#060a16");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Stars
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    for (let i = 0; i < 26; i++) {
      const x = ((i * 83) % W) + 5;
      const y = ((i * 137) % (H - 100)) + 10;
      ctx.fillRect(x, y, 1.6, 1.6);
    }

    // Bricks
    bricks.forEach((b) => {
      if (!b.alive) return;
      ctx.save();
      ctx.shadowColor = b.color;
      ctx.shadowBlur = 9;
      ctx.fillStyle = b.color;
      rr(b.x, b.y, b.w, b.h, 5);
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = "rgba(255,255,255,0.22)";
      rr(b.x + 2, b.y + 2, b.w - 4, b.h * 0.3, 3);
      ctx.fill();
    });

    // Particles
    particles = particles.filter((p) => p.life > 0);
    particles.forEach((p) => {
      p.x += p.vx * 0.016;
      p.y += p.vy * 0.016;
      p.life -= 0.045;
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
    });
    ctx.globalAlpha = 1;

    // Trail
    trail.forEach((t, i) => {
      const a = (i / trail.length) * 0.28;
      ctx.fillStyle = `rgba(34,211,238,${a})`;
      ctx.beginPath();
      ctx.arc(t.x, t.y, ball.r * (0.4 + (i / trail.length) * 0.6), 0, Math.PI * 2);
      ctx.fill();
    });

    // Paddle
    const pg = ctx.createLinearGradient(paddle.x, 0, paddle.x + PADDLE_W, 0);
    pg.addColorStop(0, "#8b5cf6");
    pg.addColorStop(0.5, "#22d3ee");
    pg.addColorStop(1, "#8b5cf6");
    ctx.save();
    ctx.shadowColor = "rgba(34,211,238,0.75)";
    ctx.shadowBlur = 18;
    ctx.fillStyle = pg;
    rr(paddle.x, PADDLE_Y, PADDLE_W, PADDLE_H, 6.5);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = "rgba(255,255,255,0.32)";
    rr(paddle.x + 3, PADDLE_Y + 2, PADDLE_W - 6, 3, 1.5);
    ctx.fill();

    // Ball
    ctx.save();
    ctx.shadowColor = "rgba(34,211,238,0.95)";
    ctx.shadowBlur = 20;
    ctx.fillStyle = "#e0faff";
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (state === "serve") {
      ctx.fillStyle = "rgba(238,242,255,0.75)";
      ctx.font = "600 15px Outfit, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Tap or press Space to launch", W / 2, PADDLE_Y - 40);
    }

    if (state === "paused") {
      ctx.fillStyle = "rgba(7,11,24,0.4)";
      ctx.fillRect(0, 0, W, H);
    }
  }

  function loop(now) {
    const dt = Math.min(0.033, (now - (lastTime || now)) / 1000);
    lastTime = now;

    if (state === "playing" || state === "serve") {
      const move = 520 * dt;
      if (keys.left) paddle.x -= move;
      if (keys.right) paddle.x += move;
      paddle.x = clamp(paddle.x, 0, W - PADDLE_W);

      if (state === "serve") {
        ball.x = paddle.x + PADDLE_W / 2;
        ball.y = PADDLE_Y - ball.r - 1;
      } else {
        updateBall(dt);
      }
    }

    draw();
    requestAnimationFrame(loop);
  }

  /* ---------- input ---------- */
  function pointerToPaddle(e) {
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    paddle.x = clamp(x - PADDLE_W / 2, 0, W - PADDLE_W);
    if (state === "serve") {
      ball.x = paddle.x + PADDLE_W / 2;
      ball.y = PADDLE_Y - ball.r - 1;
    }
  }

  canvas.addEventListener("pointermove", (e) => {
    if (state === "playing" || state === "serve") pointerToPaddle(e);
  });
  canvas.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    if (state === "serve") {
      pointerToPaddle(e);
      launch();
    } else if (state === "playing") {
      pointerToPaddle(e);
    } else if (state === "ready" || state === "over") {
      start();
    }
  });

  onKeys({
    ArrowLeft: () => (keys.left = true),
    ArrowRight: () => (keys.right = true),
    a: () => (keys.left = true),
    d: () => (keys.right = true),
    " ": () => {
      if (state === "serve") launch();
      else if (state === "ready" || state === "over") start();
      else if (state === "paused") resume();
    },
    Enter: () => {
      if (state === "ready" || state === "over") start();
      else if (state === "paused") resume();
    },
    p: () => (state === "playing" || state === "serve" ? pause() : state === "paused" ? resume() : null),
  });

  window.addEventListener("keyup", (e) => {
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") keys.left = false;
    if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") keys.right = false;
  });

  window.addEventListener("blur", () => {
    keys.left = false;
    keys.right = false;
  });

  pauseBtn.addEventListener("click", () => {
    if (state === "playing" || state === "serve") pause();
    else if (state === "paused") resume();
  });

  ovBtn.addEventListener("click", () => {
    if (state === "paused") resume();
    else start();
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && (state === "playing" || state === "serve")) pause();
  });

  /* ---------- go ---------- */
  paddle.x = (W - PADDLE_W) / 2;
  buildBricks();
  resetBall();
  updateHud();
  draw();
  showOverlay(
    "🧨",
    "Breakout",
    "Drag to move the paddle. Tap or press <b>Space</b> to launch.<br>Clear every brick to level up.",
    "Play"
  );
  requestAnimationFrame(loop);
})();
