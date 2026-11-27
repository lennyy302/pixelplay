/* PixelPlay — Snake */
(function () {
  "use strict";

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const COLS = 20;
  const ROWS = 20;
  const CELL = canvas.width / COLS;

  const scoreEl = document.getElementById("score");
  const bestEl = document.getElementById("best");
  const pauseBtn = document.getElementById("pauseBtn");
  const overlay = document.getElementById("overlay");
  const ovIcon = document.getElementById("ovIcon");
  const ovTitle = document.getElementById("ovTitle");
  const ovText = document.getElementById("ovText");
  const ovBtn = document.getElementById("ovBtn");

  let snake = [];
  let dir = { x: 1, y: 0 };
  let nextDir = { x: 1, y: 0 };
  let food = { x: 15, y: 10 };
  let score = 0;
  let best = Best.get("snake") || 0;
  let speed = 135;
  let acc = 0;
  let lastTime = 0;
  let state = "ready"; // ready | playing | paused | over
  let pops = [];
  let foodPulse = 0;

  function reset() {
    snake = [
      { x: 10, y: 10 },
      { x: 9, y: 10 },
      { x: 8, y: 10 },
    ];
    dir = { x: 1, y: 0 };
    nextDir = { x: 1, y: 0 };
    score = 0;
    speed = 135;
    acc = 0;
    pops = [];
    spawnFood();
    updateHud();
  }

  function spawnFood() {
    let guard = 0;
    do {
      food = { x: randInt(0, COLS - 1), y: randInt(0, ROWS - 1) };
      guard++;
    } while (snake.some((s) => s.x === food.x && s.y === food.y) && guard < 500);
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

  function hideOverlay() {
    overlay.classList.add("hidden");
  }

  function start() {
    reset();
    state = "playing";
    pauseBtn.textContent = "⏸ Pause";
    hideOverlay();
    SFX.tone(440, 0.06, "sine", 0.04);
    SFX.tone(660, 0.08, "sine", 0.04, 0.07);
  }

  function gameOver() {
    state = "over";
    const isBest = Best.set("snake", score);
    if (isBest) best = score;
    Best.render();
    updateHud();
    SFX.tone(180, 0.2, "sawtooth", 0.05);
    SFX.tone(120, 0.3, "sawtooth", 0.05, 0.16);
    showOverlay(
      isBest ? "🏆" : "💥",
      isBest ? "New best!" : "Game over",
      `You scored <b>${score}</b>${isBest ? " — a new personal best!" : "."}<br>Length: ${snake.length} segments.`,
      "Play again"
    );
  }

  function pause() {
    if (state !== "playing") return;
    state = "paused";
    pauseBtn.textContent = "▶ Resume";
    showOverlay("⏸️", "Paused", "Take a breather. Your snake is waiting.", "Resume");
  }

  function resume() {
    if (state !== "paused") return;
    state = "playing";
    pauseBtn.textContent = "⏸ Pause";
    hideOverlay();
  }

  function turn(x, y) {
    if (state === "ready" || state === "over") {
      start();
      if (!(x === -dir.x && y === -dir.y) && !(x === dir.x && y === dir.y)) {
        nextDir = { x, y };
      }
      return;
    }
    if (state !== "playing") return;
    if (x === -dir.x && y === -dir.y) return;
    if (x === dir.x && y === dir.y) return;
    nextDir = { x, y };
  }

  function step() {
    dir = nextDir;
    const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

    if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) {
      gameOver();
      return;
    }

    const eats = head.x === food.x && head.y === food.y;
    const bodyLimit = eats ? snake.length : snake.length - 1;
    for (let i = 0; i < bodyLimit; i++) {
      if (snake[i].x === head.x && snake[i].y === head.y) {
        gameOver();
        return;
      }
    }

    snake.unshift(head);

    if (eats) {
      score += 10;
      speed = Math.max(65, speed - 2.5);
      burst(food.x, food.y);
      SFX.tone(720, 0.06, "square", 0.045);
      SFX.tone(980, 0.07, "square", 0.035, 0.05);
      spawnFood();
      if (snake.length >= COLS * ROWS) {
        state = "over";
        Best.set("snake", score);
        Best.render();
        showOverlay("🌟", "Perfect game!", `You filled the board with <b>${score}</b> points.`, "Play again");
        return;
      }
    } else {
      snake.pop();
    }

    updateHud();
  }

  function burst(x, y) {
    for (let i = 0; i < 9; i++) {
      const angle = (Math.PI * 2 * i) / 9 + rand(-0.2, 0.2);
      const power = rand(0.5, 1.6);
      pops.push({
        x: (x + 0.5) * CELL,
        y: (y + 0.5) * CELL,
        vx: Math.cos(angle) * power,
        vy: Math.sin(angle) * power,
        life: 1,
      });
    }
  }

  function rr(x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(x, y, w, h, r);
    } else {
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
    }
    ctx.closePath();
  }

  function draw(now) {
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    // Board
    const bg = ctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, "#0b1226");
    bg.addColorStop(1, "#080d1c");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = "rgba(255,255,255,0.028)";
    ctx.lineWidth = 1;
    for (let i = 1; i < COLS; i++) {
      ctx.beginPath();
      ctx.moveTo(i * CELL, 0);
      ctx.lineTo(i * CELL, h);
      ctx.stroke();
    }
    for (let i = 1; i < ROWS; i++) {
      ctx.beginPath();
      ctx.moveTo(0, i * CELL);
      ctx.lineTo(w, i * CELL);
      ctx.stroke();
    }

    // Food
    const fx = (food.x + 0.5) * CELL;
    const fy = (food.y + 0.5) * CELL;
    foodPulse += 0.08;
    const pulse = 1 + Math.sin(foodPulse) * 0.08;
    ctx.save();
    ctx.shadowColor = "rgba(251,113,133,0.9)";
    ctx.shadowBlur = 16;
    ctx.fillStyle = "#fb7185";
    ctx.beginPath();
    ctx.arc(fx, fy, 7 * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.beginPath();
    ctx.arc(fx - 2, fy - 2.4, 1.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#4ade80";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(fx + 2, fy - 6.5);
    ctx.quadraticCurveTo(fx + 5, fy - 10, fx + 7.5, fy - 8);
    ctx.stroke();

    // Snake
    for (let i = snake.length - 1; i >= 0; i--) {
      const s = snake[i];
      const px = s.x * CELL;
      const py = s.y * CELL;
      const inset = i === 0 ? 1.5 : 2.4;
      const t = i / Math.max(1, snake.length - 1);

      ctx.save();
      if (i === 0) {
        ctx.shadowColor = "rgba(163,230,53,0.65)";
        ctx.shadowBlur = 14;
      }
      ctx.fillStyle = i === 0 ? "#c6f24e" : `hsl(${132 + t * 18}, 70%, ${54 - t * 16}%)`;
      rr(px + inset, py + inset, CELL - inset * 2, CELL - inset * 2, i === 0 ? 7 : 6);
      ctx.fill();
      ctx.restore();

      if (i === 0) {
        // Eyes look in the direction of travel
        const cx = px + CELL / 2;
        const cy = py + CELL / 2;
        const ox = dir.y !== 0 ? 4 : 3;
        const oy = dir.x !== 0 ? 4 : 3;
        const fwd = 2.5;
        ctx.fillStyle = "#10240b";
        ctx.beginPath();
        ctx.arc(cx - ox + dir.x * fwd, cy - oy + dir.y * fwd, 1.9, 0, Math.PI * 2);
        ctx.arc(cx + ox + dir.x * fwd, cy + oy + dir.y * fwd, 1.9, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Eat particles
    pops = pops.filter((p) => p.life > 0);
    pops.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.96;
      p.vy *= 0.96;
      p.life -= 0.045;
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = "#fda4af";
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2.2, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    if (state === "paused") {
      ctx.fillStyle = "rgba(7,11,24,0.45)";
      ctx.fillRect(0, 0, w, h);
    }

    if (state === "ready") {
      // soft vignette so the overlay reads nicely
      const vg = ctx.createRadialGradient(w / 2, h / 2, 60, w / 2, h / 2, w * 0.72);
      vg.addColorStop(0, "rgba(7,11,24,0)");
      vg.addColorStop(1, "rgba(7,11,24,0.55)");
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, w, h);
    }
  }

  function loop(now) {
    const dt = Math.min(60, now - (lastTime || now));
    lastTime = now;

    if (state === "playing") {
      acc += dt;
      while (acc >= speed) {
        acc -= speed;
        step();
        if (state !== "playing") break;
      }
    }

    draw(now);
    requestAnimationFrame(loop);
  }

  /* ---------- input ---------- */
  onKeys({
    ArrowUp: () => turn(0, -1),
    ArrowDown: () => turn(0, 1),
    ArrowLeft: () => turn(-1, 0),
    ArrowRight: () => turn(1, 0),
    w: () => turn(0, -1),
    s: () => turn(0, 1),
    a: () => turn(-1, 0),
    d: () => turn(1, 0),
    " ": () => {
      if (state === "playing") pause();
      else if (state === "paused") resume();
      else if (state === "ready" || state === "over") start();
    },
    Enter: () => {
      if (state === "ready" || state === "over") start();
      else if (state === "paused") resume();
    },
    p: () => {
      if (state === "playing") pause();
      else if (state === "paused") resume();
    },
  });

  document.querySelectorAll("[data-dir]").forEach((btn) => {
    btn.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      const d = btn.dataset.dir;
      if (d === "up") turn(0, -1);
      else if (d === "down") turn(0, 1);
      else if (d === "left") turn(-1, 0);
      else turn(1, 0);
    });
  });

  onSwipe(canvas, (d) => {
    if (d === "up") turn(0, -1);
    else if (d === "down") turn(0, 1);
    else if (d === "left") turn(-1, 0);
    else turn(1, 0);
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
  showOverlay("🐍", "Snake", "Swipe, tap the arrows, or use <b>WASD / arrow keys</b>.<br>Eat the fruit. Don't crash.", "Play");
  requestAnimationFrame(loop);
})();
