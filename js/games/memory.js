/* PixelPlay — Memory */
(function () {
  "use strict";

  const grid = document.getElementById("memoryGrid");
  const movesEl = document.getElementById("moves");
  const timeEl = document.getElementById("time");
  const bestEl = document.getElementById("best");
  const newBtn = document.getElementById("newBtn");
  const overlay = document.getElementById("overlay");
  const ovIcon = document.getElementById("ovIcon");
  const ovTitle = document.getElementById("ovTitle");
  const ovText = document.getElementById("ovText");
  const ovBtn = document.getElementById("ovBtn");

  const EMOJIS = ["🍕", "🚀", "🐙", "🎧", "🌵", "🍩", "👾", "🦊"];

  let deck = [];
  let first = null;
  let second = null;
  let lock = false;
  let moves = 0;
  let matched = 0;
  let startTime = null;
  let elapsed = 0;
  let timer = null;
  let state = "playing";

  function shuffle(list) {
    const copy = list.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function build() {
    deck = shuffle(EMOJIS.concat(EMOJIS)).map((emoji, index) => ({
      emoji,
      index,
      matched: false,
      flipped: false,
    }));

    grid.innerHTML = "";
    deck.forEach((card, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "mem-card";
      btn.dataset.index = i;
      btn.setAttribute("aria-label", "Hidden card " + (i + 1));
      btn.innerHTML =
        '<span class="mem-inner">' +
        '<span class="mem-face mem-back">?</span>' +
        '<span class="mem-face mem-front">' +
        card.emoji +
        "</span></span>";
      btn.addEventListener("click", () => flip(i));
      grid.appendChild(btn);
      card.el = btn;
    });
  }

  function updateHud() {
    movesEl.textContent = moves;
    timeEl.textContent = fmtTime(elapsed);
  }

  function startTimer() {
    if (startTime !== null) return;
    startTime = Date.now() - elapsed * 1000;
    timer = setInterval(() => {
      elapsed = (Date.now() - startTime) / 1000;
      timeEl.textContent = fmtTime(elapsed);
    }, 250);
  }

  function stopTimer() {
    if (timer) clearInterval(timer);
    timer = null;
  }

  function flip(index) {
    if (lock || state !== "playing") return;
    const card = deck[index];
    if (card.matched || card.flipped) return;

    startTimer();
    card.flipped = true;
    card.el.classList.add("flipped");
    card.el.setAttribute("aria-label", card.emoji);
    SFX.tone(520, 0.05, "sine", 0.035);

    if (!first) {
      first = card;
      return;
    }

    second = card;
    moves++;
    updateHud();

    if (first.emoji === second.emoji) {
      first.matched = true;
      second.matched = true;
      matched++;
      first.el.classList.add("matched");
      second.el.classList.add("matched");
      first.el.disabled = true;
      second.el.disabled = true;
      SFX.notes([
        [660, 0.06, 0],
        [880, 0.09, 0.06],
      ]);
      first = null;
      second = null;
      if (matched === EMOJIS.length) {
        win();
      }
    } else {
      lock = true;
      const a = first;
      const b = second;
      SFX.tone(200, 0.08, "square", 0.03);
      setTimeout(() => {
        a.flipped = false;
        b.flipped = false;
        a.el.classList.remove("flipped");
        b.el.classList.remove("flipped");
        a.el.setAttribute("aria-label", "Hidden card");
        b.el.setAttribute("aria-label", "Hidden card");
        first = null;
        second = null;
        lock = false;
      }, 780);
    }
  }

  function win() {
    state = "won";
    stopTimer();
    elapsed = Math.max(1, Math.round(elapsed));
    const isBest = Best.set("memory", elapsed, "low");
    Best.render();
    timeEl.textContent = fmtTime(elapsed);
    SFX.notes([
      [523, 0.1, 0],
      [659, 0.1, 0.1],
      [784, 0.1, 0.2],
      [1046, 0.2, 0.3],
    ]);
    showOverlay(
      isBest ? "🏆" : "🧠",
      isBest ? "New best time!" : "All matched!",
      `You cleared the board in <b>${fmtTime(elapsed)}</b> and <b>${moves}</b> moves.${isBest ? "<br>That's a new personal best!" : ""}`,
      "Play again"
    );
  }

  function showOverlay(icon, title, text, button) {
    ovIcon.textContent = icon;
    ovTitle.textContent = title;
    ovText.innerHTML = text;
    ovBtn.textContent = button;
    overlay.classList.remove("hidden");
  }

  function newGame() {
    stopTimer();
    state = "playing";
    first = null;
    second = null;
    lock = false;
    moves = 0;
    matched = 0;
    startTime = null;
    elapsed = 0;
    overlay.classList.add("hidden");
    build();
    updateHud();
    Best.render();
  }

  newBtn.addEventListener("click", newGame);
  ovBtn.addEventListener("click", newGame);

  newGame();
})();
