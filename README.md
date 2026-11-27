# 🕹️ PixelPlay

A tiny browser arcade with **12 single-player games**, built to run on phones, iPads and desktop browsers. No accounts, no downloads, no build step.

## ⚠️ A note about PHP

The original request mentioned PHP. **GitHub Pages only serves static files** — it cannot execute PHP. If you upload a `.php` file there, visitors get the source code as a download instead of a working page.

So PixelPlay is deliberately **100% HTML, CSS and JavaScript**. Everything (game logic, scores, sound) runs in the browser. If you later move the folder to a PHP-capable host, it will keep working exactly the same.

## The games

| Game | Type | Controls |
| --- | --- | --- |
| 🐍 Snake | Arcade | Swipe, arrow keys / WASD, on-screen D-pad |
| 🧱 Tetris | Puzzle | Swipe / buttons / arrow keys, Space to hard drop |
| 🧨 Breakout | Arcade | Drag, mouse, ← → |
| 🐤 Flappy | Action | Tap / click / Space |
| 🔢 2048 | Puzzle | Swipe / arrow keys / WASD |
| 🧠 Memory | Brain | Tap / click cards |
| 💣 Minesweeper | Puzzle | Tap to reveal, flag mode or right-click |
| 🏓 Pong | Classic | Drag / mouse / W or S / ↑ ↓ |
| 👾 Invaders | Action | Drag / arrows / FIRE button / Space |
| ⭕ Tic-Tac-Toe | Classic | Tap / click, easy or unbeatable AI |
| 🔨 Whack-a-Mole | Action | Tap / click the moles |
| 🎵 Simon | Brain | Tap the pads / keys 1–4 |

## Features

- Responsive layout for phone, tablet and desktop
- Touch controls plus keyboard and mouse support
- High scores saved locally with `localStorage`
- WebAudio sound effects with a mute toggle (remembered between visits)
- Pause, restart and game-over overlays
- No frameworks, no dependencies, no tracking
- Works when hosted from a subfolder (all paths are relative)

## Run it locally

From this folder:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

You can also open `index.html` directly in a browser, though running a local server is closer to how GitHub Pages behaves.

## Deploy to GitHub Pages

1. Create a new repository on GitHub.
2. Upload the contents of this folder (or push it with Git). `index.html` must be at the repository root.
3. In the repository, go to **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select the `main` branch and the `/ (root)` folder, then save.
6. Wait a minute — the site appears at `https://<username>.github.io/<repository>/`.

The included `.nojekyll` file tells GitHub Pages to skip Jekyll processing, which keeps the deployment simple and fast.

## Project structure

```
pixelplay/
├── index.html          # Kopfrechentrainer cover page (type 6969 to enter)
├── arcade.html         # Arcade home page
├── 404.html            # Friendly not-found page
├── .nojekyll           # Disable Jekyll on GitHub Pages
├── css/
│   ├── style.css       # Site shell, home page, shared buttons
│   └── game.css        # Game shell, HUD, boards, overlays
├── js/
│   ├── common.js       # Storage, best scores, sound, input helpers
│   ├── site.js         # Search, filters, random game
│   └── games/          # One file per game
└── games/              # One HTML page per game
```

## How scores are stored

Each game writes a value under the `pixelplay:best:<game>` key in `localStorage`. Score games keep the highest value; timed games (Memory and Minesweeper) keep the lowest time. Clearing your browser's site data resets all scores.

Sound preference is stored under `pixelplay:sound`, and Tic-Tac-Toe's win/loss/draw record under `pixelplay:ttt:*`.

## Browser support

PixelPlay targets current versions of Chrome, Edge, Firefox and Safari (including iOS/iPadOS). It uses standard Canvas 2D, CSS Grid, `localStorage` and WebAudio. If sound is blocked until the first tap, that is normal on iOS — the first interaction unlocks it.

## Customising

- **Add a game:** create `games/mygame.html` and `js/games/mygame.js`, link the shared CSS/JS, then add a card to `arcade.html`.
- **Change colours:** each card and stage sets `--g1` / `--g2` gradient variables.
- **Change the title or text:** edit `arcade.html`; the site name is plain markup.

No build tools are required — edit a file and refresh.
