/* PixelPlay — Minesweeper */
(function () {
  "use strict";

  const gridEl = document.getElementById("msGrid");
  const minesEl = document.getElementById("minesLeft");
  const timeEl = document.getElementById("time");
  const flagBtn = document.getElementById("flagBtn");
  const newBtn = document.getElementById("newBtn");
  const overlay = document.getElementById("overlay");
  const ovIcon = document.getElementById("ovIcon");
  const ovTitle = document.getElementById("ovTitle");
  const ovText = document.getElementById("ovText");
  const ovBtn = document.getElementById("ovBtn");

  const SIZE = 9;
  const MINES = 10;

  let board = [];
  let cells = [];
  let minesPlaced = false;
  let flags = 0;
  let revealedCount = 0;
  let state = "playing";
  let flagMode = false;
  let startTime = null;
  let elapsed = 0;
  let timer = null;

  function neighbors(r, c) {
    const out = [];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE) out.push([nr, nc]);
      }
    }
    return out;
  }

  function newGame() {
    stopTimer();
    board = Array.from({ length: SIZE }, () =>
      Array.from({ length: SIZE }, () => ({
        mine: false,
        revealed: false,
        flagged: false,
        count: 0,
        el: null,
      }))
    );
    cells = [];
    minesPlaced = false;
    flags = 0;
    revealedCount = 0;
    state = "playing";
    flagMode = false;
    flagBtn.classList.remove("active");
    flagBtn.textContent = "🚩 Flag: off";
    startTime = null;
    elapsed = 0;
    overlay.classList.add("hidden");
    gridEl.innerHTML = "";

    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "ms-cell";
        btn.setAttribute("aria-label", "Hidden cell");
        btn.addEventListener("click", () => onCell(r, c));
        btn.addEventListener("contextmenu", (e) => {
          e.preventDefault();
          toggleFlag(r, c);
        });
        gridEl.appendChild(btn);
        board[r][c].el = btn;
        cells.push({ r, c, el: btn });
      }
    }

    updateHud();
    Best.render();
  }

  function placeMines(safeR, safeC) {
    const safe = new Set();
    safe.add(safeR + "," + safeC);
    neighbors(safeR, safeC).forEach(([r, c]) => safe.add(r + "," + c));

    let placed = 0;
    while (placed < MINES) {
      const r = randInt(0, SIZE - 1);
      const c = randInt(0, SIZE - 1);
      if (safe.has(r + "," + c) || board[r][c].mine) continue;
      board[r][c].mine = true;
      placed++;
    }

    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (board[r][c].mine) continue;
        board[r][c].count = neighbors(r, c).filter(([nr, nc]) => board[nr][nc].mine).length;
      }
    }
    minesPlaced = true;
  }

  function startTimer() {
    if (startTime !== null) return;
    startTime = Date.now();
    timer = setInterval(() => {
      elapsed = (Date.now() - startTime) / 1000;
      timeEl.textContent = fmtTime(elapsed);
    }, 250);
  }

  function stopTimer() {
    if (timer) clearInterval(timer);
    timer = null;
  }

  function updateHud() {
    minesEl.textContent = Math.max(0, MINES - flags);
    timeEl.textContent = fmtTime(elapsed);
  }

  function paint(cell) {
    const data = board[cell.r][cell.c];
    const el = cell.el;
    el.className = "ms-cell";
    el.textContent = "";
    el.removeAttribute("disabled");

    if (data.revealed) {
      el.classList.add("revealed");
      if (data.mine) {
        el.classList.add("mine");
        el.textContent = "💣";
      } else if (data.count > 0) {
        el.classList.add("n" + data.count);
        el.textContent = data.count;
      }
      el.setAttribute("aria-label", data.mine ? "Mine" : data.count + " nearby mines");
    } else if (data.flagged) {
      el.classList.add("flagged");
      el.textContent = "🚩";
      el.setAttribute("aria-label", "Flagged cell");
    } else {
      el.setAttribute("aria-label", "Hidden cell");
    }
  }

  function reveal(r, c) {
    const data = board[r][c];
    if (data.revealed || data.flagged) return;
    if (!minesPlaced) placeMines(r, c);
    startTimer();

    if (data.mine) {
      data.revealed = true;
      paint({ r, c, el: data.el });
      data.el.classList.add("exploded");
      lose(r, c);
      return;
    }

    const stack = [[r, c]];
    while (stack.length) {
      const [cr, cc] = stack.pop();
      const cell = board[cr][cc];
      if (cell.revealed || cell.flagged || cell.mine) continue;
      cell.revealed = true;
      revealedCount++;
      paint({ r: cr, c: cc, el: cell.el });
      if (cell.count === 0) {
        neighbors(cr, cc).forEach(([nr, nc]) => {
          if (!board[nr][nc].revealed && !board[nr][nc].flagged) stack.push([nr, nc]);
        });
      }
    }

    SFX.tone(300 + Math.random() * 120, 0.03, "square", 0.02);

    if (revealedCount === SIZE * SIZE - MINES) {
      win();
    }
  }

  function toggleFlag(r, c) {
    const data = board[r][c];
    if (state !== "playing" || data.revealed) return;
    if (!data.flagged && flags >= MINES) {
      toast("All flags are used");
      return;
    }
    data.flagged = !data.flagged;
    flags += data.flagged ? 1 : -1;
    paint({ r, c, el: data.el });
    updateHud();
    SFX.tone(data.flagged ? 620 : 380, 0.04, "triangle", 0.03);
  }

  function onCell(r, c) {
    if (state !== "playing") return;
    if (flagMode) toggleFlag(r, c);
    else reveal(r, c);
  }

  function revealAll() {
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const cell = board[r][c];
        if (cell.mine && !cell.flagged) {
          cell.revealed = true;
          paint({ r, c, el: cell.el });
        } else if (!cell.mine && cell.flagged) {
          cell.el.classList.add("revealed");
          cell.el.textContent = "❌";
        }
      }
    }
  }

  function win() {
    state = "won";
    stopTimer();
    elapsed = Math.max(1, Math.round(elapsed));
    const isBest = Best.set("minesweeper", elapsed, "low");
    Best.render();
    timeEl.textContent = fmtTime(elapsed);
    flags = MINES;
    updateHud();
    SFX.notes([
      [523, 0.1, 0],
      [659, 0.1, 0.1],
      [784, 0.1, 0.2],
      [1046, 0.2, 0.3],
    ]);
    showOverlay(
      isBest ? "🏆" : "🎉",
      isBest ? "New best time!" : "Field cleared!",
      `You swept the field in <b>${fmtTime(elapsed)}</b>.${isBest ? "<br>That's a new personal best!" : ""}`,
      "Play again"
    );
  }

  function lose(r, c) {
    state = "lost";
    stopTimer();
    SFX.tone(140, 0.25, "sawtooth", 0.06);
    SFX.tone(90, 0.35, "sawtooth", 0.05, 0.18);
    revealAll();
    showOverlay(
      "💥",
      "Boom!",
      `You hit a mine after <b>${fmtTime(elapsed)}</b>.<br>Better luck next sweep.`,
      "Try again"
    );
  }

  function showOverlay(icon, title, text, button) {
    ovIcon.textContent = icon;
    ovTitle.textContent = title;
    ovText.innerHTML = text;
    ovBtn.textContent = button;
    overlay.classList.remove("hidden");
  }

  flagBtn.addEventListener("click", () => {
    flagMode = !flagMode;
    flagBtn.classList.toggle("active", flagMode);
    flagBtn.textContent = flagMode ? "🚩 Flag: on" : "🚩 Flag: off";
    SFX.tone(flagMode ? 560 : 400, 0.04, "sine", 0.03);
  });

  newBtn.addEventListener("click", newGame);
  ovBtn.addEventListener("click", newGame);

  newGame();
})();
