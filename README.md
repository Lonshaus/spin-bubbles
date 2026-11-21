# Spin Bubbles 3D

**English** | [繁體中文](README.zh-TW.md)

A 3D tribute to the classic MSN game *Hexic* (旋轉泡泡球). Rendered with three.js, no build step required — just play it in your browser.

**▶ Play now: https://lonshaus.github.io/hexic/**

## How to play

- Point at a spot where three gems meet and **left-click** to spin them in the current direction. **One key switches direction**: right-click, Space, or the ↻ / ↺ button at the bottom left. On touch screens, tap to select and tap again to spin.
- **Three touching gems of one color (a triangle)** pop; a straight line doesn't count. Matches formed by falling gems become chains.
- **Combos to go** at the top is how many matches are left in this level: 50 on level 1, +10 per level. Level 7 is the final level and has no goal.
- Levels 1–3 use 5 colors; light blue joins at level 4 and dark green at level 6. Scoring: a group of three is worth 5 × level, and each gem with a small star inside doubles its group.
- Surround a gem with 6 of one color and it becomes a **gold star** (1000 × level). Three touching stars pop regardless of color. A ring of 6 stars makes a **black pearl** (10000 × level).
- **Get three black pearls touching to win.** From level 3, **bombs** start falling; the game ends when one counts down to zero or no moves are left.
- Keyboard: Space switches direction, Enter / X spins, H hint, P / Esc pause, M mute.

The interface is available in Traditional Chinese, English and Japanese. All sound effects and music are synthesized live with the Web Audio API.

## Install as an app (PWA)

- **Android / desktop Chrome or Edge**: use the "Install app" button on the title screen, or "Install" from the browser menu.
- **iPhone / iPad**: open it in Safari, tap Share → Add to Home Screen.

The same guide is built into the game (the install button opens it on browsers that can't install directly, and it's also at the end of "How to play"). Once installed it works offline and updates itself when you're online.

## Project structure

```
js/core/   Game rules (pure data, no rendering, testable in Node)
js/view/   three.js rendering: scene, pieces, effects, event animations
js/ui/     HUD, i18n, audio, localStorage
vendor/    three.js r180 (MIT, pinned)
tests/     node --test unit tests
```

Each move, the rules layer emits a sequence of events (rotate → clear → fall → …) that the view layer simply plays back in order.

This is a personal, non-commercial fan tribute and is not affiliated with Microsoft. All graphics and sounds are generated in code.
