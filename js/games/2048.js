/* PixelPlay — 2048 */
(function () {
  "use strict";

  const board = document.getElementById("board");
  const tilesEl = document.getElementById("tiles");
  const scoreEl = document.getElementById("score");
  const bestEl = document.getElementById("best");
  const newBtn = document.getElementById("newBtn");
  const overlay = document.getElementById("overlay");
  const ovIcon = document.getElementById("ovIcon");
  const ovTitle = document.getElementById("ovTitle");
  const ovText = document.getElementById("ovText");
  const ovBtn = document.getElementById("ovBtn");

  const SIZE = 4;
  const PAD = 10;
  const GAP = 10;

  let grid = [];
  let tiles = [];
  let metrics = { cell: 70, pad: PAD, gap: GAP };
  let score = 0;
  let best = Best.get("2048") || 0;
  let state = "playing"; // playing | won | over
  let won = false;
  let idSeq = 0;

  function emptyGrid() {
    return Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
  }

  function valueClass(value) {
    if (value > 2048) return "tbig";
    return "t" + value;
  }

  function digitsClass(value) {
    if (value >= 10000) return " tiny";
    if (value >= 1000) return " small";
    return "";
  }

  function paint(tile) {
    tile.el.className = "tile2048 " + valueClass(tile.value) + digitsClass(tile.value);
    tile.el.textContent = tile.value;
  }

  function position(tile, instant) {
    const { cell, pad, gap } = metrics;
    const left = pad + tile.c * (cell + gap);
    const top = pad + tile.r * (cell + gap);
    tile.el.style.width = cell + "px";
    tile.el.style.height = cell + "px";
    if (instant) tile.el.style.transition = "none";
    tile.el.style.transform = "translate(" + left + "px, " + top + "px)";
    if (instant) {
      void tile.el.offsetWidth;
      tile.el.style.transition = "";
    }
  }

  function measure() {
    const width = board.clientWidth;
    if (!width) return;
    const cell = (width - PAD * 2 - GAP * (SIZE - 1)) / SIZE;
    metrics = { cell, pad: PAD, gap: GAP };
    tiles.forEach((tile) => position(tile, false));
  }

  function addTile(r, c, value, isNew) {
    const tile = { id: ++idSeq, value, r, c, el: document.createElement("div") };
    tile.el.textContent = value;
    tile.el.className = "tile2048 " + valueClass(value) + digitsClass(value);
    tile.el.style.width = metrics.cell + "px";
    tile.el.style.height = metrics.cell + "px";
    tile.el.style.transform =
      "translate(" +
      (metrics.pad + c * (metrics.cell + metrics.gap)) +
      "px, " +
      (metrics.pad + r * (metrics.cell + metrics.gap)) +
      "px)";
    tilesEl.appendChild(tile.el);
    if (isNew) {
      tile.el.classList.add("new");
      setTimeout(() => tile.el && tile.el.classList.remove("new"), 220);
    }
    tiles.push(tile);
    grid[r][c] = tile;
    return tile;
  }

  function randomTile() {
    const empty = [];
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (!grid[r][c]) empty.push({ r, c });
      }
    }
    if (!empty.length) return false;
    const spot = empty[Math.floor(Math.random() * empty.length)];
    addTile(spot.r, spot.c, Math.random() < 0.9 ? 2 : 4, true);
    return true;
  }

  function removeTile(tile) {
    if (tile.el && tile.el.parentNode) tile.el.parentNode.removeChild(tile.el);
    tiles = tiles.filter((t) => t !== tile);
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

  function newGame() {
    state = "playing";
    won = false;
    score = 0;
    grid = emptyGrid();
    tiles.forEach((t) => t.el.remove());
    tiles = [];
    tilesEl.innerHTML = "";
    measure();
    randomTile();
    randomTile();
    updateHud();
    overlay.classList.add("hidden");
  }

  function canMove() {
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (!grid[r][c]) return true;
        const v = grid[r][c].value;
        if (c + 1 < SIZE && grid[r][c + 1] && grid[r][c + 1].value === v) return true;
        if (r + 1 < SIZE && grid[r + 1][c] && grid[r + 1][c].value === v) return true;
      }
    }
    return false;
  }

  function checkWin() {
    if (won) return false;
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (grid[r][c] && grid[r][c].value >= 2048) {
          won = true;
          state = "won";
          Best.set("2048", score);
          Best.render();
          updateHud();
          SFX.notes([
            [523, 0.1, 0],
            [659, 0.1, 0.1],
            [784, 0.1, 0.2],
            [1046, 0.18, 0.3],
          ]);
          showOverlay(
            "🏆",
            "2048!",
            `You built the magic tile with <b>${score}</b> points.<br>Keep going for an even bigger number.`,
            "Keep going"
          );
          return true;
        }
      }
    }
    return false;
  }

  function gameOver() {
    state = "over";
    const isBest = Best.set("2048", score);
    if (isBest) best = score;
    Best.render();
    updateHud();
    SFX.tone(180, 0.2, "sawtooth", 0.05);
    SFX.tone(120, 0.3, "sawtooth", 0.05, 0.16);
    showOverlay(
      isBest ? "🏆" : "🧊",
      isBest ? "New best!" : "No moves left",
      `Score <b>${score}</b>${isBest ? " — a new personal best!" : ". The board is full."}`,
      "Try again"
    );
  }

  function move(dir) {
    if (state !== "playing") return;

    const horizontal = dir === "left" || dir === "right";
    const forward = dir === "left" || dir === "up";
    let moved = false;
    let gained = 0;
    const merged = [];

    for (let line = 0; line < SIZE; line++) {
      const items = [];
      for (let i = 0; i < SIZE; i++) {
        const r = horizontal ? line : forward ? i : SIZE - 1 - i;
        const c = horizontal ? (forward ? i : SIZE - 1 - i) : line;
        if (grid[r][c]) items.push(grid[r][c]);
      }

      const out = [];
      for (let i = 0; i < items.length; i++) {
        const tile = items[i];
        const next = items[i + 1];
        if (next && tile.value === next.value) {
          tile.value *= 2;
          gained += tile.value;
          merged.push(tile);
          removeTile(next);
          out.push(tile);
          i++;
          moved = true;
        } else {
          out.push(tile);
        }
      }

      // Clear the whole line first.
      for (let i = 0; i < SIZE; i++) {
        const r = horizontal ? line : forward ? i : SIZE - 1 - i;
        const c = horizontal ? (forward ? i : SIZE - 1 - i) : line;
        grid[r][c] = null;
      }

      out.forEach((tile, i) => {
        const r = horizontal ? line : forward ? i : SIZE - 1 - i;
        const c = horizontal ? (forward ? i : SIZE - 1 - i) : line;
        if (tile.r !== r || tile.c !== c) moved = true;
        tile.r = r;
        tile.c = c;
        grid[r][c] = tile;
      });
    }

    if (!moved) return;

    score += gained;
    updateHud();

    merged.forEach((tile) => {
      paint(tile);
      tile.el.classList.remove("merged");
      void tile.el.offsetWidth;
      tile.el.classList.add("merged");
      setTimeout(() => tile.el && tile.el.classList.remove("merged"), 240);
    });

    tiles.forEach((tile) => position(tile, false));

    if (gained > 0) {
      SFX.tone(440 + Math.min(300, gained), 0.06, "sine", 0.04);
    } else {
      SFX.tone(300, 0.025, "sine", 0.02);
    }

    randomTile();

    if (checkWin()) return;
    if (!canMove()) {
      gameOver();
    }
  }

  /* ---------- input ---------- */
  onKeys({
    ArrowLeft: () => move("left"),
    ArrowRight: () => move("right"),
    ArrowUp: () => move("up"),
    ArrowDown: () => move("down"),
    a: () => move("left"),
    d: () => move("right"),
    w: () => move("up"),
    s: () => move("down"),
    Enter: () => {
      if (state === "over") newGame();
      else if (state === "won") {
        state = "playing";
        overlay.classList.add("hidden");
      }
    },
  });

  onSwipe(board, (dir) => move(dir));

  newBtn.addEventListener("click", () => {
    if (state === "playing" && score > 0) {
      // quick restart without a blocking confirm
      newGame();
      toast("Fresh board");
    } else {
      newGame();
    }
  });

  ovBtn.addEventListener("click", () => {
    if (state === "won") {
      state = "playing";
      overlay.classList.add("hidden");
    } else {
      newGame();
    }
  });

  if (window.ResizeObserver) {
    new ResizeObserver(() => measure()).observe(board);
  } else {
    window.addEventListener("resize", measure);
  }

  /* ---------- go ---------- */
  grid = emptyGrid();
  measure();
  newGame();
  updateHud();
  requestAnimationFrame(measure);
})();
