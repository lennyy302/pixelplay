/* ============================================================
   PixelPlay — home page filtering + random pick
   ============================================================ */
(function () {
  "use strict";

  const cards = Array.from(document.querySelectorAll(".card"));
  const chips = Array.from(document.querySelectorAll(".chip"));
  const search = document.getElementById("search");
  const count = document.getElementById("gameCount");
  const empty = document.getElementById("emptyState");
  const randomBtn = document.getElementById("randomBtn");
  const resetFilters = document.getElementById("resetFilters");

  let category = "all";
  let query = "";

  function applyFilters() {
    let visible = 0;

    cards.forEach((card) => {
      const inCategory = category === "all" || card.dataset.cat === category;
      const haystack = (card.dataset.search || "") + " " + card.textContent.toLowerCase();
      const matches = !query || haystack.toLowerCase().includes(query);
      const show = inCategory && matches;
      card.style.display = show ? "" : "none";
      if (show) visible++;
    });

    if (count) count.textContent = visible + (visible === 1 ? " game" : " games");
    if (empty) empty.classList.toggle("show", visible === 0);
  }

  chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      category = chip.dataset.cat || "all";
      chips.forEach((c) => c.classList.toggle("active", c === chip));
      applyFilters();
      if (window.SFX) SFX.tone(520, 0.04, "sine", 0.03);
    });
  });

  if (search) {
    search.addEventListener("input", () => {
      query = search.value.trim().toLowerCase();
      applyFilters();
    });

    window.addEventListener("keydown", (e) => {
      const tag = document.activeElement && document.activeElement.tagName;
      const typing = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
      if (e.key === "/" && !typing) {
        e.preventDefault();
        search.focus();
        search.select();
      }
      if (e.key === "Escape" && document.activeElement === search) {
        search.value = "";
        query = "";
        applyFilters();
        search.blur();
      }
    });
  }

  if (resetFilters) {
    resetFilters.addEventListener("click", () => {
      category = "all";
      query = "";
      if (search) search.value = "";
      chips.forEach((c) => c.classList.toggle("active", c.dataset.cat === "all"));
      applyFilters();
    });
  }

  if (randomBtn) {
    randomBtn.addEventListener("click", () => {
      const pool = cards.filter((card) => card.style.display !== "none");
      const choices = pool.length ? pool : cards;
      const pick = choices[Math.floor(Math.random() * choices.length)];
      if (pick) {
        randomBtn.disabled = true;
        randomBtn.textContent = "🎲 Loading…";
        window.location.href = pick.getAttribute("href");
      }
    });
  }

  // Gentle stagger for cards as they appear.
  cards.forEach((card, index) => card.style.setProperty("--i", index));

  applyFilters();
})();
