/* PixelPlay — Tic-Tac-Toe */
(function () {
  "use strict";

  const gridEl = document.getElementById("tttGrid");
  const statusEl = document.getElementById("status");
  const winsEl = document.getElementById("wins");
  const lossesEl = document.getElementById("losses");
  const drawsEl = document.getElementById("draws");
  const newBtn = document.getElementById("newRoundBtn");
  const levelBtns = Array.from(document.querySelectorAll("[data-level]"));

  const LINES = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];

  let board = Array(9).fill(null);
  let state = "playing";
  let lock = false;
  let difficulty = "hard";
  let wins = Store.get("ttt:wins", 0) || 0;
  let losses = Store.get("ttt:losses", 0) || 0;
  let draws = Store.get("ttt:draws", 0) || 0;
  let cells = [];
  let roundId = 0;

  function build() {
    gridEl.innerHTML = "";
    cells = [];
    for (let i = 0; i < 9; i++) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "ttt-cell";
      btn.dataset.index = i;
      btn.setAttribute("aria-label", "Cell " + (i + 1));
      btn.addEventListener("click", () => onCell(i));
      gridEl.appendChild(btn);
      cells.push(btn);
    }
  }

  function updateScore() {
    winsEl.textContent = wins;
    lossesEl.textContent = losses;
    drawsEl.textContent = draws;
    Store.set("ttt:wins", wins);
    Store.set("ttt:losses", losses);
    Store.set("ttt:draws", draws);
    Best.set("tictactoe", wins);
    Best.render();
  }

  function render() {
    board.forEach((value, i) => {
      const cell = cells[i];
      cell.textContent = value || "";
      cell.className = "ttt-cell" + (value === "X" ? " x" : value === "O" ? " o" : "");
      cell.disabled = state !== "playing" || lock || !!value;
      cell.setAttribute("aria-label", value ? "Cell " + (i + 1) + ": " + value : "Empty cell " + (i + 1));
    });
  }

  function checkWinner(b) {
    for (const line of LINES) {
      const [a, c, d] = line;
      if (b[a] && b[a] === b[c] && b[a] === b[d]) {
        return { winner: b[a], line };
      }
    }
    return b.every((v) => v) ? { winner: "draw", line: null } : null;
  }

  function minimax(b, isMax, depth) {
    const result = checkWinner(b);
    if (result) {
      if (result.winner === "O") return 10 - depth;
      if (result.winner === "X") return depth - 10;
      return 0;
    }

    if (isMax) {
      let bestScore = -Infinity;
      for (let i = 0; i < 9; i++) {
        if (b[i]) continue;
        b[i] = "O";
        bestScore = Math.max(bestScore, minimax(b, false, depth + 1));
        b[i] = null;
      }
      return bestScore;
    }

    let bestScore = Infinity;
    for (let i = 0; i < 9; i++) {
      if (b[i]) continue;
      b[i] = "X";
      bestScore = Math.min(bestScore, minimax(b, true, depth + 1));
      b[i] = null;
    }
    return bestScore;
  }

  function bestMove(b) {
    let bestScore = -Infinity;
    let move = -1;
    for (let i = 0; i < 9; i++) {
      if (b[i]) continue;
      b[i] = "O";
      const score = minimax(b, false, 0);
      b[i] = null;
      if (score > bestScore) {
        bestScore = score;
        move = i;
      }
    }
    return move;
  }

  function randomMove(b) {
    const empty = [];
    for (let i = 0; i < 9; i++) if (!b[i]) empty.push(i);
    return empty[Math.floor(Math.random() * empty.length)];
  }

  function endRound(result) {
    state = "over";
    render();

    if (result.winner === "X") {
      wins++;
      updateScore();
      result.line.forEach((i) => cells[i].classList.add("win"));
      statusEl.textContent = "You win! Nice one. 🎉";
      statusEl.className = "status-line win";
      SFX.notes([
        [523, 0.08, 0],
        [659, 0.08, 0.08],
        [784, 0.12, 0.16],
      ]);
    } else if (result.winner === "O") {
      losses++;
      updateScore();
      result.line.forEach((i) => cells[i].classList.add("win"));
      statusEl.textContent = difficulty === "hard" ? "CPU wins. It's unbeatable on hard." : "CPU wins this one.";
      statusEl.className = "status-line lose";
      SFX.notes([
        [300, 0.1, 0],
        [240, 0.14, 0.1],
        [180, 0.2, 0.24],
      ]);
    } else {
      draws++;
      updateScore();
      statusEl.textContent = "It's a draw. Nobody blinked.";
      statusEl.className = "status-line";
      SFX.notes([
        [440, 0.08, 0],
        [440, 0.1, 0.1],
      ]);
    }
  }

  function aiTurn() {
    if (state !== "playing") return;
    const move = difficulty === "easy" ? randomMove(board) : bestMove(board);
    if (move < 0) return;
    board[move] = "O";
    SFX.tone(320, 0.05, "triangle", 0.035);
    render();

    const result = checkWinner(board);
    if (result) {
      endRound(result);
      return;
    }

    lock = false;
    statusEl.textContent = "Your turn — you're X.";
    statusEl.className = "status-line";
    render();
  }

  function onCell(index) {
    if (state !== "playing" || lock || board[index]) return;
    board[index] = "X";
    SFX.tone(520, 0.05, "sine", 0.035);
    render();

    const result = checkWinner(board);
    if (result) {
      endRound(result);
      return;
    }

    lock = true;
    statusEl.textContent = "CPU is thinking…";
    statusEl.className = "status-line";
    render();
    const id = roundId;
    setTimeout(() => {
      if (id === roundId) aiTurn();
    }, 320);
  }

  function newRound() {
    roundId++;
    board = Array(9).fill(null);
    state = "playing";
    lock = false;
    statusEl.textContent = "Your turn — you're X.";
    statusEl.className = "status-line";
    render();
  }

  levelBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      difficulty = btn.dataset.level;
      levelBtns.forEach((b) => b.classList.toggle("active", b === btn));
      toast(difficulty === "hard" ? "Hard mode: good luck" : "Easy mode: CPU is napping");
      newRound();
    });
  });

  newBtn.addEventListener("click", newRound);

  build();
  updateScore();
  newRound();
})();
