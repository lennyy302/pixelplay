/* PixelPlay — Tetris */
(function () {
  "use strict";

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const nextCanvas = document.getElementById("next");
  const nctx = nextCanvas.getContext("2d");

  const COLS = 10;
  const ROWS = 20;
  const BLOCK = canvas.width / COLS;

  const SHAPES = {
    I: [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    J: [
      [1, 0, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
    L: [
      [0, 0, 1],
      [1, 1, 1],
      [0, 0, 0],
    ],
    O: [
      [1, 1],
      [1, 1],
    ],
    S: [
      [0, 1, 1],
      [1, 1, 0],
      [0, 0, 0],
    ],
    T: [
      [0, 1, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
    Z: [
      [1, 1, 0],
      [0, 1, 1],
      [0, 0, 0],
    ],
  };

  const COLORS = {
    I: "#22d3ee",
    J: "#6366f1",
    L: "#fb923c",
    O: "#facc15",
    S: "#4ade80",
    T: "#c084fc",
    Z: "#fb7185",
  };

  const scoreEl = document.getElementById("score");
  const linesEl = document.getElementById("lines");
  const levelEl = document.getElementById("level");
  const bestEl = document.getElementById("best");
  const pauseBtn = document.getElementById("pauseBtn");
  const overlay = document.getElementById("overlay");
  const ovIcon = document.getElementById("ovIcon");
  const ovTitle = document.getElementById("ovTitle");
  const ovText = document.getElementById("ovText");
  const ovBtn = document.getElementById("ovBtn");
  const stage = document.getElementById("stage");

  let board = [];
  let piece = null;
  let nextType = null;
  let bag = [];
  let score = 0;
  let lines = 0;
  let level = 1;
  let best = Best.get("tetris") || 0;
  let state = "ready";
  let dropAcc = 0;
  let lastTime = 0;

  function emptyBoard() {
    return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  }

  function takeType() {
    if (!bag.length) {
      bag = Object.keys(SHAPES);
      for (let i = bag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [bag[i], bag[j]] = [bag[j], bag[i]];
      }
    }
    return bag.pop();
  }

  function spawnPiece() {
    const type = nextType || takeType();
    nextType = takeType();
    const matrix = SHAPES[type].map((row) => row.slice());
    piece = {
      type,
      matrix,
      x: Math.floor((COLS - matrix[0].length) / 2),
      y: type === "I" ? -1 : 0,
    };
    drawNext();
    if (collides(piece.matrix, piece.x, piece.y)) {
      gameOver();
      return false;
    }
    return true;
  }

  function collides(matrix, ox, oy) {
    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < matrix[r].length; c++) {
        if (!matrix[r][c]) continue;
        const x = ox + c;
        const y = oy + r;
        if (x < 0 || x >= COLS || y >= ROWS) return true;
        if (y >= 0 && board[y][x]) return true;
      }
    }
    return false;
  }

  function rotateMatrix(matrix) {
    return matrix[0].map((_, i) => matrix.map((row) => row[i]).reverse());
  }

  function rotate() {
    if (state !== "playing") return;
    const rotated = rotateMatrix(piece.matrix);
    const kicks = [0, -1, 1, -2, 2];
    for (const kick of kicks) {
      if (!collides(rotated, piece.x + kick, piece.y)) {
        piece.matrix = rotated;
        piece.x += kick;
        SFX.tone(420, 0.04, "square", 0.03);
        return;
      }
    }
    // Try nudging up off the floor.
    if (!collides(rotated, piece.x, piece.y - 1)) {
      piece.matrix = rotated;
      piece.y -= 1;
      SFX.tone(420, 0.04, "square", 0.03);
    }
  }

  function move(dx) {
    if (state !== "playing") return;
    if (!collides(piece.matrix, piece.x + dx, piece.y)) {
      piece.x += dx;
      SFX.tone(240, 0.025, "square", 0.02);
    }
  }

  function softDrop() {
    if (state !== "playing") return;
    if (!collides(piece.matrix, piece.x, piece.y + 1)) {
      piece.y += 1;
      score += 1;
      updateHud();
    } else {
      lockPiece();
    }
  }

  function hardDrop() {
    if (state !== "playing") return;
    let distance = 0;
    while (!collides(piece.matrix, piece.x, piece.y + 1)) {
      piece.y += 1;
      distance++;
    }
    score += distance * 2;
    SFX.tone(180, 0.07, "triangle", 0.05);
    lockPiece();
  }

  function lockPiece() {
    let topOut = false;
    piece.matrix.forEach((row, r) => {
      row.forEach((cell, c) => {
        if (!cell) return;
        const y = piece.y + r;
        const x = piece.x + c;
        if (y < 0) {
          topOut = true;
          return;
        }
        board[y][x] = piece.type;
      });
    });

    if (topOut) {
      gameOver();
      return;
    }

    const cleared = clearLines();
    if (cleared > 0) {
      const table = [0, 100, 300, 500, 800];
      score += table[cleared] * level;
      lines += cleared;
      const newLevel = 1 + Math.floor(lines / 10);
      if (newLevel > level) {
        level = newLevel;
        toast("Level " + level + "!");
        SFX.notes([
          [523, 0.08, 0],
          [659, 0.08, 0.08],
          [784, 0.12, 0.16],
        ]);
      } else {
        SFX.notes([
          [660, 0.06, 0],
          [880, 0.1, 0.06],
        ]);
      }
      stage.classList.add("shake");
      setTimeout(() => stage.classList.remove("shake"), 320);
      updateHud();
    } else {
      SFX.tone(140, 0.05, "triangle", 0.04);
    }

    spawnPiece();
    dropAcc = 0;
    updateHud();
  }

  function clearLines() {
    let cleared = 0;
    for (let y = ROWS - 1; y >= 0; y--) {
      if (board[y].every((cell) => cell)) {
        board.splice(y, 1);
        board.unshift(Array(COLS).fill(null));
        cleared++;
        y++;
      }
    }
    return cleared;
  }

  function updateHud() {
    scoreEl.textContent = score;
    linesEl.textContent = lines;
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

  function start() {
    board = emptyBoard();
    bag = [];
    nextType = takeType();
    score = 0;
    lines = 0;
    level = 1;
    dropAcc = 0;
    state = "playing";
    pauseBtn.textContent = "⏸ Pause";
    overlay.classList.add("hidden");
    spawnPiece();
    updateHud();
    SFX.tone(440, 0.06, "sine", 0.04);
    SFX.tone(660, 0.08, "sine", 0.04, 0.07);
  }

  function gameOver() {
    state = "over";
    const isBest = Best.set("tetris", score);
    if (isBest) best = score;
    Best.render();
    updateHud();
    SFX.tone(180, 0.2, "sawtooth", 0.05);
    SFX.tone(120, 0.3, "sawtooth", 0.05, 0.16);
    showOverlay(
      isBest ? "🏆" : "💥",
      isBest ? "New best!" : "Game over",
      `Score <b>${score}</b> · ${lines} lines · level ${level}${isBest ? "<br>A new personal best!" : ""}`,
      "Play again"
    );
  }

  function pause() {
    if (state !== "playing") return;
    state = "paused";
    pauseBtn.textContent = "▶ Resume";
    showOverlay("⏸️", "Paused", "The blocks will wait. Probably.", "Resume");
  }

  function resume() {
    if (state !== "paused") return;
    state = "playing";
    pauseBtn.textContent = "⏸ Pause";
    overlay.classList.add("hidden");
  }

  function rr(c, x, y, w, h, r) {
    c.beginPath();
    if (c.roundRect) {
      c.roundRect(x, y, w, h, r);
    } else {
      c.moveTo(x + r, y);
      c.arcTo(x + w, y, x + w, y + h, r);
      c.arcTo(x + w, y + h, x, y + h, r);
      c.arcTo(x, y + h, x, y, r);
      c.arcTo(x, y, x + w, y, r);
    }
    c.closePath();
  }

  function drawCell(c, x, y, size, color, alpha) {
    const pad = Math.max(1, size * 0.055);
    c.globalAlpha = alpha == null ? 1 : alpha;
    c.fillStyle = color;
    rr(c, x + pad, y + pad, size - pad * 2, size - pad * 2, size * 0.13);
    c.fill();
    c.fillStyle = "rgba(255,255,255,0.22)";
    rr(c, x + pad + 2, y + pad + 2, size - pad * 2 - 4, (size - pad * 2) * 0.28, size * 0.07);
    c.fill();
    c.globalAlpha = 1;
  }

  function drawNext() {
    nctx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
    if (!nextType) return;
    const matrix = SHAPES[nextType];
    const color = COLORS[nextType];
    let minR = 9;
    let maxR = -1;
    let minC = 9;
    let maxC = -1;
    matrix.forEach((row, r) =>
      row.forEach((cell, c) => {
        if (!cell) return;
        minR = Math.min(minR, r);
        maxR = Math.max(maxR, r);
        minC = Math.min(minC, c);
        maxC = Math.max(maxC, c);
      })
    );
    const rows = maxR - minR + 1;
    const cols = maxC - minC + 1;
    const size = Math.min(18, Math.floor(Math.min(nextCanvas.width, nextCanvas.height) / Math.max(rows, cols)) - 2);
    const ox = (nextCanvas.width - cols * size) / 2;
    const oy = (nextCanvas.height - rows * size) / 2;
    matrix.forEach((row, r) =>
      row.forEach((cell, c) => {
        if (!cell) return;
        drawCell(nctx, ox + (c - minC) * size, oy + (r - minR) * size, size, color, 1);
      })
    );
  }

  function draw() {
    const w = canvas.width;
    const h = canvas.height;

    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, "#0b1226");
    bg.addColorStop(1, "#070c1a");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Grid
    ctx.strokeStyle = "rgba(255,255,255,0.035)";
    ctx.lineWidth = 1;
    for (let x = 1; x < COLS; x++) {
      ctx.beginPath();
      ctx.moveTo(x * BLOCK, 0);
      ctx.lineTo(x * BLOCK, h);
      ctx.stroke();
    }
    for (let y = 1; y < ROWS; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * BLOCK);
      ctx.lineTo(w, y * BLOCK);
      ctx.stroke();
    }

    // Locked blocks
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const type = board[y][x];
        if (type) drawCell(ctx, x * BLOCK, y * BLOCK, BLOCK, COLORS[type], 1);
      }
    }

    if (piece) {
      // Ghost
      let ghostY = piece.y;
      while (!collides(piece.matrix, piece.x, ghostY + 1)) ghostY++;
      piece.matrix.forEach((row, r) =>
        row.forEach((cell, c) => {
          if (!cell) return;
          const y = ghostY + r;
          if (y >= 0) {
            ctx.globalAlpha = 0.16;
            ctx.fillStyle = COLORS[piece.type];
            rr(ctx, (piece.x + c) * BLOCK + 2, y * BLOCK + 2, BLOCK - 4, BLOCK - 4, 5);
            ctx.fill();
            ctx.globalAlpha = 1;
          }
        })
      );

      // Active piece
      piece.matrix.forEach((row, r) =>
        row.forEach((cell, c) => {
          if (!cell) return;
          const y = piece.y + r;
          if (y >= 0) {
            drawCell(ctx, (piece.x + c) * BLOCK, y * BLOCK, BLOCK, COLORS[piece.type], 1);
          }
        })
      );
    }

    if (state === "ready") {
      const vg = ctx.createRadialGradient(w / 2, h / 2, 60, w / 2, h / 2, w * 0.9);
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
      const interval = Math.max(70, 800 - (level - 1) * 65);
      dropAcc += dt;
      let guard = 0;
      while (dropAcc >= interval && state === "playing" && guard < 8) {
        dropAcc -= interval;
        guard++;
        if (!collides(piece.matrix, piece.x, piece.y + 1)) {
          piece.y += 1;
        } else {
          lockPiece();
          dropAcc = 0;
        }
      }
    }

    draw();
    requestAnimationFrame(loop);
  }

  /* ---------- input ---------- */
  onKeys({
    ArrowLeft: () => move(-1),
    ArrowRight: () => move(1),
    ArrowDown: () => softDrop(),
    ArrowUp: () => rotate(),
    x: () => rotate(),
    z: () => rotate(),
    " ": () => hardDrop(),
    p: () => (state === "playing" ? pause() : state === "paused" ? resume() : null),
    Enter: () => {
      if (state === "ready" || state === "over") start();
      else if (state === "paused") resume();
    },
  });

  document.querySelectorAll("[data-action]").forEach((btn) => {
    const action = btn.dataset.action;
    const fire = () => {
      if (state === "ready" || state === "over") {
        if (action === "rotate" || action === "drop") return;
        start();
        return;
      }
      if (action === "left") move(-1);
      else if (action === "right") move(1);
      else if (action === "rotate") rotate();
      else if (action === "down") softDrop();
      else if (action === "drop") hardDrop();
    };

    if (action === "left" || action === "right" || action === "down") {
      bindHold(btn, fire, 170, 60);
    } else {
      btn.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        fire();
      });
    }
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
  board = emptyBoard();
  nextType = takeType();
  drawNext();
  draw();
  showOverlay(
    "🧱",
    "Tetris",
    "Move with <b>← →</b>, rotate with <b>↑</b>, drop with <b>space</b>.<br>Clear lines. Chase the high score.",
    "Play"
  );
  requestAnimationFrame(loop);
})();
