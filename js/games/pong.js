/* PixelPlay — Pong */
(function () {
  "use strict";

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;

  const playerScoreEl = document.getElementById("playerScore");
  const cpuScoreEl = document.getElementById("cpuScore");
  const bestEl = document.getElementById("best");
  const pauseBtn = document.getElementById("pauseBtn");
  const overlay = document.getElementById("overlay");
  const ovIcon = document.getElementById("ovIcon");
  const ovTitle = document.getElementById("ovTitle");
  const ovText = document.getElementById("ovText");
  const ovBtn = document.getElementById("ovBtn");

  const WIN_SCORE = 7;
  const PADDLE_W = 12;
  const PADDLE_H = 86;
  const BALL_R = 8;
  const PLAYER_X = 26;
  const AI_X = W - 26 - PADDLE_W;

  let player = { y: H / 2 - PADDLE_H / 2 };
  let ai = { y: H / 2 - PADDLE_H / 2 };
  let ball = { x: W / 2, y: H / 2, vx: 0, vy: 0, r: BALL_R };
  let trail = [];
  let playerScore = 0;
  let cpuScore = 0;
  let rally = 0;
  let bestRally = Best.get("pong") || 0;
  let speed = 310;
  let state = "ready";
  let pausedFrom = "playing";
  let serveDelay = 0;
  let serveDir = 1;
  let lastTime = 0;
  let keys = { up: false, down: false };

  function updateHud() {
    playerScoreEl.textContent = playerScore;
    cpuScoreEl.textContent = cpuScore;
    bestEl.textContent = Math.max(bestRally, rally);
  }

  function showOverlay(icon, title, text, button) {
    ovIcon.textContent = icon;
    ovTitle.textContent = title;
    ovText.innerHTML = text;
    ovBtn.textContent = button;
    overlay.classList.remove("hidden");
  }

  function centerBall(dir) {
    ball.x = W / 2;
    ball.y = H / 2;
    ball.vx = 0;
    ball.vy = 0;
    trail = [];
    serveDir = dir;
    serveDelay = 0.85;
    state = "serving";
  }

  function launch() {
    const angle = rand(-0.32, 0.32);
    ball.vx = Math.cos(angle) * speed * serveDir;
    ball.vy = Math.sin(angle) * speed;
    state = "playing";
    SFX.tone(520, 0.05, "square", 0.035);
  }

  function start() {
    playerScore = 0;
    cpuScore = 0;
    rally = 0;
    speed = 310;
    player.y = H / 2 - PADDLE_H / 2;
    ai.y = H / 2 - PADDLE_H / 2;
    updateHud();
    overlay.classList.add("hidden");
    pauseBtn.textContent = "⏸ Pause";
    centerBall(Math.random() < 0.5 ? -1 : 1);
    SFX.tone(440, 0.06, "sine", 0.04);
    SFX.tone(660, 0.08, "sine", 0.04, 0.07);
  }

  function gameOver() {
    state = "over";
    const isBest = Best.set("pong", bestRally);
    if (isBest) bestRally = Math.max(bestRally, rally);
    Best.render();
    updateHud();
    const won = playerScore > cpuScore;
    SFX.notes(
      won
        ? [
            [523, 0.1, 0],
            [659, 0.1, 0.1],
            [784, 0.1, 0.2],
            [1046, 0.2, 0.3],
          ]
        : [
            [300, 0.12, 0],
            [240, 0.16, 0.12],
            [180, 0.24, 0.28],
          ]
    );
    showOverlay(
      won ? "🏆" : "🤖",
      won ? "You win!" : "CPU wins",
      `Final score <b>${playerScore} – ${cpuScore}</b>. Best rally: <b>${bestRally}</b> hits.`,
      "Play again"
    );
  }

  function point(who) {
    if (who === "player") {
      playerScore++;
      SFX.tone(760, 0.07, "square", 0.045);
    } else {
      cpuScore++;
      SFX.tone(220, 0.1, "square", 0.045);
    }
    bestRally = Math.max(bestRally, rally);
    rally = 0;
    speed = 310;
    updateHud();

    if (playerScore >= WIN_SCORE || cpuScore >= WIN_SCORE) {
      gameOver();
      return;
    }
    centerBall(who === "player" ? 1 : -1);
  }

  function pause() {
    if (state !== "playing" && state !== "serving") return;
    keys.up = false;
    keys.down = false;
    pausedFrom = state;
    state = "paused";
    pauseBtn.textContent = "▶ Resume";
    showOverlay("⏸️", "Paused", "The ball is taking a little break.", "Resume");
  }

  function resume() {
    if (state !== "paused") return;
    state = pausedFrom;
    pauseBtn.textContent = "⏸ Pause";
    overlay.classList.add("hidden");
    lastTime = 0;
  }

  function bounceOffPaddle(paddleY, isPlayer) {
    const center = paddleY + PADDLE_H / 2;
    const hit = clamp((ball.y - center) / (PADDLE_H / 2), -1, 1);
    const angle = hit * (Math.PI / 3.2);
    speed = Math.min(560, speed + 9);
    rally++;
    bestRally = Math.max(bestRally, rally);
    updateHud();

    if (isPlayer) {
      ball.x = PLAYER_X + PADDLE_W + ball.r;
      ball.vx = Math.cos(angle) * speed;
    } else {
      ball.x = AI_X - ball.r;
      ball.vx = -Math.cos(angle) * speed;
    }
    ball.vy = Math.sin(angle) * speed;
    SFX.tone(300 + Math.abs(hit) * 260, 0.04, "square", 0.04);
  }

  function update(dt) {
    if (state === "serving") {
      serveDelay -= dt;
      if (serveDelay <= 0) launch();
      return;
    }
    if (state !== "playing") return;

    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    if (ball.y - ball.r < 0) {
      ball.y = ball.r;
      ball.vy = Math.abs(ball.vy);
      SFX.tone(420, 0.025, "square", 0.025);
    } else if (ball.y + ball.r > H) {
      ball.y = H - ball.r;
      ball.vy = -Math.abs(ball.vy);
      SFX.tone(420, 0.025, "square", 0.025);
    }

    // Player paddle
    if (
      ball.vx < 0 &&
      ball.x - ball.r <= PLAYER_X + PADDLE_W &&
      ball.x + ball.r >= PLAYER_X &&
      ball.y + ball.r >= player.y &&
      ball.y - ball.r <= player.y + PADDLE_H
    ) {
      bounceOffPaddle(player.y, true);
    }

    // CPU paddle
    if (
      ball.vx > 0 &&
      ball.x + ball.r >= AI_X &&
      ball.x - ball.r <= AI_X + PADDLE_W &&
      ball.y + ball.r >= ai.y &&
      ball.y - ball.r <= ai.y + PADDLE_H
    ) {
      bounceOffPaddle(ai.y, false);
    }

    if (ball.x + ball.r < 0) {
      point("cpu");
      return;
    }
    if (ball.x - ball.r > W) {
      point("player");
      return;
    }

    trail.push({ x: ball.x, y: ball.y });
    if (trail.length > 10) trail.shift();

    // CPU tracking
    const target = ball.y - PADDLE_H / 2 + Math.sin(performance.now() / 700) * 12;
    const maxSpeed = 265;
    const diff = target - ai.y;
    ai.y += clamp(diff, -maxSpeed * dt, maxSpeed * dt);
    ai.y = clamp(ai.y, 0, H - PADDLE_H);
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
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, "#081020");
    bg.addColorStop(0.5, "#0b172c");
    bg.addColorStop(1, "#081020");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Center line
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 14]);
    ctx.beginPath();
    ctx.moveTo(W / 2, 18);
    ctx.lineTo(W / 2, H - 18);
    ctx.stroke();
    ctx.setLineDash([]);

    // Scores
    ctx.textAlign = "center";
    ctx.font = "800 56px Outfit, sans-serif";
    ctx.fillStyle = "rgba(238,242,255,0.9)";
    ctx.fillText(String(playerScore), W / 2 - 92, 74);
    ctx.fillText(String(cpuScore), W / 2 + 92, 74);
    ctx.font = "600 12px Outfit, sans-serif";
    ctx.fillStyle = "rgba(143,155,184,0.85)";
    ctx.fillText("YOU", W / 2 - 92, 94);
    ctx.fillText("CPU", W / 2 + 92, 94);

    // Trail
    trail.forEach((t, i) => {
      const a = (i / trail.length) * 0.24;
      ctx.fillStyle = `rgba(34,211,238,${a})`;
      ctx.beginPath();
      ctx.arc(t.x, t.y, ball.r * (0.4 + (i / trail.length) * 0.6), 0, Math.PI * 2);
      ctx.fill();
    });

    // Paddles
    const playerGradient = ctx.createLinearGradient(PLAYER_X, 0, PLAYER_X + PADDLE_W, 0);
    playerGradient.addColorStop(0, "#a78bfa");
    playerGradient.addColorStop(1, "#22d3ee");
    ctx.save();
    ctx.shadowColor = "rgba(34,211,238,0.7)";
    ctx.shadowBlur = 16;
    ctx.fillStyle = playerGradient;
    rr(PLAYER_X, player.y, PADDLE_W, PADDLE_H, 6);
    ctx.fill();

    const aiGradient = ctx.createLinearGradient(AI_X, 0, AI_X + PADDLE_W, 0);
    aiGradient.addColorStop(0, "#fb7185");
    aiGradient.addColorStop(1, "#f472b6");
    ctx.fillStyle = aiGradient;
    ctx.shadowColor = "rgba(251,113,133,0.7)";
    rr(AI_X, ai.y, PADDLE_W, PADDLE_H, 6);
    ctx.fill();
    ctx.restore();

    // Ball
    ctx.save();
    ctx.shadowColor = "rgba(255,255,255,0.9)";
    ctx.shadowBlur = 20;
    ctx.fillStyle = "#f8fafc";
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (state === "serving") {
      ctx.fillStyle = "rgba(238,242,255,0.65)";
      ctx.font = "600 16px Outfit, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Get ready…", W / 2, H / 2 - 44);
    }

    if (state === "paused") {
      ctx.fillStyle = "rgba(7,11,24,0.35)";
      ctx.fillRect(0, 0, W, H);
    }
  }

  function loop(now) {
    const dt = Math.min(0.033, (now - (lastTime || now)) / 1000);
    lastTime = now;

    if (state === "playing" || state === "serving") {
      const move = 470 * dt;
      if (keys.up) player.y -= move;
      if (keys.down) player.y += move;
      player.y = clamp(player.y, 0, H - PADDLE_H);
      update(dt);
    }

    draw();
    requestAnimationFrame(loop);
  }

  /* ---------- input ---------- */
  function pointerY(e) {
    const rect = canvas.getBoundingClientRect();
    const y = ((e.clientY - rect.top) / rect.height) * H;
    return clamp(y - PADDLE_H / 2, 0, H - PADDLE_H);
  }

  canvas.addEventListener("pointermove", (e) => {
    if (state === "playing" || state === "serving") {
      player.y = pointerY(e);
    }
  });

  canvas.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    if (state === "ready" || state === "over") {
      start();
    } else if (state === "playing" || state === "serving") {
      player.y = pointerY(e);
    }
  });

  onKeys({
    ArrowUp: () => (keys.up = true),
    ArrowDown: () => (keys.down = true),
    w: () => (keys.up = true),
    s: () => (keys.down = true),
    " ": () => {
      if (state === "ready" || state === "over") start();
      else if (state === "paused") resume();
    },
    Enter: () => {
      if (state === "ready" || state === "over") start();
      else if (state === "paused") resume();
    },
    p: () => (state === "playing" || state === "serving" ? pause() : state === "paused" ? resume() : null),
  });

  window.addEventListener("keyup", (e) => {
    if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") keys.up = false;
    if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") keys.down = false;
  });

  window.addEventListener("blur", () => {
    keys.up = false;
    keys.down = false;
  });

  pauseBtn.addEventListener("click", () => {
    if (state === "playing" || state === "serving") pause();
    else if (state === "paused") resume();
  });

  ovBtn.addEventListener("click", () => {
    if (state === "paused") resume();
    else start();
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && (state === "playing" || state === "serving")) pause();
  });

  /* ---------- go ---------- */
  centerBall(Math.random() < 0.5 ? -1 : 1);
  state = "ready";
  ball.x = W / 2;
  ball.y = H / 2;
  updateHud();
  draw();
  showOverlay(
    "🏓",
    "Pong",
    "Move with the mouse, drag your finger, or use <b>W / S</b>.<br>First to <b>7</b> wins. Long rallies score bragging rights.",
    "Play"
  );
  requestAnimationFrame(loop);
})();
