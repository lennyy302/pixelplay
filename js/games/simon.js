/* PixelPlay — Simon */
(function () {
  "use strict";

  const pads = Array.from(document.querySelectorAll("[data-pad]"));
  const statusEl = document.getElementById("status");
  const levelEl = document.getElementById("level");
  const bestEl = document.getElementById("best");
  const overlay = document.getElementById("overlay");
  const ovIcon = document.getElementById("ovIcon");
  const ovTitle = document.getElementById("ovTitle");
  const ovText = document.getElementById("ovText");
  const ovBtn = document.getElementById("ovBtn");

  const PAD_NAMES = ["green", "red", "yellow", "blue"];
  const TONES = [329.63, 392.0, 261.63, 196.0];

  let sequence = [];
  let inputIndex = 0;
  let level = 1;
  let completed = 0;
  let best = Best.get("simon") || 0;
  let state = "idle"; // idle | showing | input | over
  let timers = [];
  let playToken = 0;

  function schedule(fn, ms) {
    const id = setTimeout(fn, ms);
    timers.push(id);
    return id;
  }

  function clearTimers() {
    timers.forEach((id) => clearTimeout(id));
    timers = [];
  }

  function updateHud() {
    levelEl.textContent = level;
    bestEl.textContent = Math.max(best, completed);
  }

  function setPadsEnabled(enabled) {
    pads.forEach((pad) => (pad.disabled = !enabled));
  }

  function flash(index, duration) {
    const pad = pads[index];
    if (!pad) return;
    pad.classList.add("active");
    SFX.tone(TONES[index], duration > 300 ? 0.24 : 0.12, "sine", 0.05);
    schedule(() => pad.classList.remove("active"), duration);
  }

  function playSequence() {
    const token = ++playToken;
    state = "showing";
    setPadsEnabled(false);
    statusEl.textContent = "Watch closely…";
    statusEl.className = "status-line";

    sequence.forEach((pad, i) => {
      schedule(() => {
        if (token !== playToken || state === "over") return;
        flash(pad, 360);
      }, 550 + i * 660);
    });

    schedule(() => {
      if (token !== playToken || state === "over") return;
      state = "input";
      inputIndex = 0;
      setPadsEnabled(true);
      statusEl.textContent = "Your turn — repeat it.";
      statusEl.className = "status-line";
    }, 550 + sequence.length * 660 + 120);
  }

  function start() {
    clearTimers();
    playToken++;
    sequence = [randInt(0, 3)];
    inputIndex = 0;
    level = 1;
    completed = 0;
    state = "showing";
    overlay.classList.add("hidden");
    updateHud();
    statusEl.textContent = "Get ready…";
    statusEl.className = "status-line";
    SFX.tone(440, 0.06, "sine", 0.04);
    schedule(playSequence, 650);
  }

  function gameOver() {
    state = "over";
    playToken++;
    setPadsEnabled(false);
    const isBest = Best.set("simon", completed);
    if (isBest) best = completed;
    Best.render();
    updateHud();
    SFX.tone(140, 0.22, "sawtooth", 0.05);
    SFX.tone(100, 0.3, "sawtooth", 0.05, 0.18);
    statusEl.textContent = "Wrong pad. Game over.";
    statusEl.className = "status-line lose";
    schedule(() => {
      showOverlay(
        isBest ? "🏆" : "🎵",
        isBest ? "New best!" : "Game over",
        `You completed <b>${completed}</b> round${completed === 1 ? "" : "s"}.${isBest ? "<br>That's a new personal best!" : ""}`,
        "Play again"
      );
    }, 420);
  }

  function press(index) {
    if (state !== "input") return;
    flash(index, 170);

    if (sequence[inputIndex] !== index) {
      gameOver();
      return;
    }

    inputIndex++;
    if (inputIndex < sequence.length) return;

    // Completed the sequence.
    completed = sequence.length;
    level = sequence.length + 1;
    const isBest = Best.set("simon", completed);
    if (isBest) best = completed;
    Best.render();
    updateHud();
    state = "showing";
    setPadsEnabled(false);
    statusEl.textContent = "Nice! Next round…";
    statusEl.className = "status-line win";
    SFX.notes([
      [660, 0.08, 0],
      [880, 0.1, 0.08],
    ]);

    const token = ++playToken;
    schedule(() => {
      if (token !== playToken || state === "over") return;
      sequence.push(randInt(0, 3));
      level = sequence.length;
      updateHud();
      playSequence();
    }, 900);
  }

  function showOverlay(icon, title, text, button) {
    ovIcon.textContent = icon;
    ovTitle.textContent = title;
    ovText.innerHTML = text;
    ovBtn.textContent = button;
    overlay.classList.remove("hidden");
  }

  pads.forEach((pad, index) => {
    pad.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      press(index);
    });
  });

  onKeys({
    "1": () => press(0),
    "2": () => press(1),
    "3": () => press(2),
    "4": () => press(3),
    Enter: () => {
      if (state === "idle" || state === "over") start();
    },
  });

  ovBtn.addEventListener("click", start);

  setPadsEnabled(false);
  updateHud();
  Best.render();
  statusEl.textContent = "Watch, remember, repeat.";
  showOverlay(
    "🎵",
    "Simon",
    "Watch the colours light up, then repeat the sequence.<br>One new step every round. How far can you go?",
    "Start"
  );
})();
