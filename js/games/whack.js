/* PixelPlay — Whack-a-Mole */
(function () {
  "use strict";

  const gridEl = document.getElementById("whackGrid");
  const scoreEl = document.getElementById("score");
  const timeEl = document.getElementById("time");
  const bestEl = document.getElementById("best");
  const overlay = document.getElementById("overlay");
  const ovIcon = document.getElementById("ovIcon");
  const ovTitle = document.getElementById("ovTitle");
  const ovText = document.getElementById("ovText");
  const ovBtn = document.getElementById("ovBtn");
  const stage = document.getElementById("stage");

  const GAME_TIME = 30;
  let holes = [];
  let score = 0;
  let best = Best.get("whack") || 0;
  let state = "ready";
  let startTime = 0;
  let timer = null;
  let spawnTimer = null;
  let endTimer = null;

  function build() {
    gridEl.innerHTML = "";
    holes = [];
    for (let i = 0; i < 9; i++) {
      const hole = document.createElement("button");
      hole.type = "button";
      hole.className = "hole";
      hole.setAttribute("aria-label", "Mole hole " + (i + 1));
      hole.innerHTML = '<span class="mole">🐹</span>';
      hole.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        whack(i);
      });
      gridEl.appendChild(hole);
      holes.push({
        el: hole,
        moleEl: hole.querySelector(".mole"),
        up: false,
        bomb: false,
        hideTimer: null,
      });
    }
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

  function elapsed() {
    return (Date.now() - startTime) / 1000;
  }

  function start() {
    clearInterval(timer);
    clearTimeout(spawnTimer);
    clearTimeout(endTimer);
    holes.forEach((h) => {
      clearTimeout(h.hideTimer);
      h.up = false;
      h.bomb = false;
      h.el.classList.remove("up", "bonk", "bomb");
      h.moleEl.textContent = "🐹";
    });

    score = 0;
    startTime = Date.now();
    state = "playing";
    timeEl.textContent = GAME_TIME;
    updateHud();
    overlay.classList.add("hidden");
    SFX.tone(440, 0.06, "sine", 0.04);
    SFX.tone(660, 0.08, "sine", 0.04, 0.07);

    timer = setInterval(tick, 100);
    spawn();
    endTimer = setTimeout(end, GAME_TIME * 1000);
  }

  function tick() {
    const left = Math.max(0, GAME_TIME - elapsed());
    timeEl.textContent = Math.ceil(left);
    if (left <= 0) end();
  }

  function spawn() {
    if (state !== "playing") return;

    const free = holes.filter((h) => !h.up && !h.el.classList.contains("bonk"));
    if (free.length) {
      const hole = free[Math.floor(Math.random() * free.length)];
      const bomb = Math.random() < 0.17 && elapsed() > 4;
      hole.up = true;
      hole.bomb = bomb;
      hole.moleEl.textContent = bomb ? "💣" : "🐹";
      hole.el.classList.add("up");
      hole.el.classList.toggle("bomb", bomb);
      SFX.tone(bomb ? 180 : 700, 0.035, "sine", 0.02);

      const visible = Math.max(480, 920 - elapsed() * 11);
      hole.hideTimer = setTimeout(() => hide(hole), visible * rand(0.85, 1.1));
    }

    const delay = Math.max(340, 780 - elapsed() * 13);
    spawnTimer = setTimeout(spawn, delay * rand(0.8, 1.2));
  }

  function hide(hole) {
    if (!hole.up) return;
    hole.up = false;
    hole.el.classList.remove("up");
    setTimeout(() => {
      hole.el.classList.remove("bomb");
      hole.bomb = false;
      hole.moleEl.textContent = "🐹";
    }, 140);
  }

  function whack(index) {
    if (state !== "playing") return;
    const hole = holes[index];
    if (!hole.up) {
      SFX.tone(160, 0.03, "square", 0.02);
      return;
    }

    clearTimeout(hole.hideTimer);
    hole.up = false;
    hole.el.classList.remove("up");
    hole.el.classList.add("bonk");

    if (hole.bomb) {
      score = Math.max(0, score - 15);
      SFX.tone(110, 0.2, "sawtooth", 0.06);
      stage.classList.add("shake");
      setTimeout(() => stage.classList.remove("shake"), 320);
      toast("Bomb! −15");
    } else {
      score += 10;
      SFX.tone(760, 0.05, "square", 0.045);
      SFX.tone(1020, 0.06, "square", 0.03, 0.05);
    }

    updateHud();
    setTimeout(() => {
      hole.el.classList.remove("bonk", "bomb");
      hole.bomb = false;
      hole.moleEl.textContent = "🐹";
    }, 190);
  }

  function end() {
    if (state === "over") return;
    state = "over";
    clearInterval(timer);
    clearTimeout(spawnTimer);
    clearTimeout(endTimer);
    holes.forEach((h) => {
      clearTimeout(h.hideTimer);
      h.up = false;
      h.el.classList.remove("up", "bonk", "bomb");
      h.moleEl.textContent = "🐹";
    });

    timeEl.textContent = "0";
    const isBest = Best.set("whack", score);
    if (isBest) best = score;
    Best.render();
    updateHud();
    SFX.notes(
      score >= 100
        ? [
            [523, 0.1, 0],
            [659, 0.1, 0.1],
            [784, 0.1, 0.2],
            [1046, 0.2, 0.3],
          ]
        : [
            [440, 0.1, 0],
            [330, 0.14, 0.1],
            [220, 0.2, 0.24],
          ]
    );
    showOverlay(
      isBest ? "🏆" : score >= 100 ? "🔨" : "🐹",
      isBest ? "New best!" : "Time's up!",
      `You scored <b>${score}</b> points${isBest ? " — a new personal best!" : "."}<br>${score >= 150 ? "Certified mole menace." : score >= 80 ? "Quick hands!" : "Those moles got lucky."}`,
      "Play again"
    );
  }

  ovBtn.addEventListener("click", start);

  build();
  updateHud();
  Best.render();
  showOverlay(
    "🔨",
    "Whack-a-Mole",
    `You have <b>${GAME_TIME} seconds</b>. Tap the moles for <b>+10</b>.<br>Careful — bombs cost you <b>−15</b>.`,
    "Start"
  );
})();
