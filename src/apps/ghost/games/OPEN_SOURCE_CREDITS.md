# GHOST LINK / Open-source provenance

Upstream mechanics reference: [GameHelix / pipe_puzzle](https://github.com/GameHelix/pipe_puzzle).

Upstream README identifies the project as **MIT © 2024**. Its game uses a depth-first (recursive backtracker) spanning-tree maze, an endpoint far from the start, scrambled rotations and breadth-first flow checking.

The game implementation here is an **adapted in-repository port of those mechanics**, not a GitHub-hosted fork of the upstream repository:

- `src/apps/ghost/games/pipe-network.js` is standalone vanilla JavaScript tailored for the existing `GHOST` engine.
- Uses the project's existing N/E/S/W bitmask format instead of importing the upstream Next.js/React components.
- Selects two distinct maximally separated terminal tiles; sizes progress 5×5, 5×5, 6×6, 6×6, 7×7.
- Only intermediate tiles rotate; the two terminals carry custom highlights.
- Requires the destination to be reached and at least two grid widths of pipes to be connected.
- A successful D01 connection holds the rendered pipe network for 3 real seconds before reporting success.
- The visual style, UI, timing, persistent save data and tests belong to 《熙蒙的手机》.

No upstream dependencies, images, fonts, assets, Tailwind styles or audio were copied.

References:
- https://github.com/GameHelix/pipe_puzzle/blob/main/src/utils/gridGenerator.ts
- https://github.com/GameHelix/pipe_puzzle/blob/main/src/utils/flowChecker.ts
- https://github.com/GameHelix/pipe_puzzle/blob/main/README.md

## Four playable mini-games (Ghost Arcade 2.0)

Mechanics research references (each upstream project identifies an MIT license):

- **CIPHER (restored)** — the existing in-project 3×3 circuit picture swap puzzle, intentionally not changed to Lights Out. Newly generated boards have only two misplaced pairs (two swaps to win), with clear numbered tile hints.
- **EXTRACT** — [Tania Rascia / Memory](https://github.com/taniarascia/memory), two-card memory matching. Adaptation uses five pairs of faux data labels, temporary mismatches, and ten persistent cards.
- **VEIL** — [OpenGames collection](https://opengames-dev.github.io/source.html), labyrinth and grid controls. Adaptation has a turn-based 5×5 grid, advancing scanners, and a solvability check across both location and scanner phase.
- **STRIKE** — [OpenGames collection](https://opengames-dev.github.io/source.html), Whac-A-Mole reaction mechanic. Adaptation uses a 4×4 grid, six correct reactions, a three-error limit, and an actual game deadline.

This is **not** a GitHub-native fork operation; it is an **in-repository reimplementation of game-mechanics ideas**. No upstream source files, images, audio, fonts, or other assets are copied into the project. This project supplies its own UI, game engine and validation tests. Source licenses are not substituted for a license covering unrelated parts of BBBTAI.

Existing completed or in-progress orders retain their persisted legacy board and UI. The D01 pipe puzzle, fixed flow-deployment UI and associated mission/financial handlers remain separate.

## November 2026 — Ghost Arcade 3 / locally ported upstream engines

Arcade 2.0 above remains accurate **for legacy attempts and historical screenshots**.
New D15–D55 market contracts opt into the actual, locally integrated source ports
rather than merely referencing game ideas:

- CIPHER: MIT Classic Puzzle Maker (Krish Lalwani), legal empty-slot shuffling
  and tile moves ported from `fifteen_puzzle.js`. Keeps Ghost's circuit imagery
  and shared result handler; no unsolvable permutation or fixed two-swap limit.
- VEIL: MIT OpenGames Labyrinth `labyrinth/logic.js` DFS maze generator and
  reciprocal-wall movement ported directly to `vendor/opengames-mechanics.js`;
  Ghost adds per-board scanner trails and checks reachable exit with time phase.
- EXTRACT: MIT OpenGames Memory `memory/game.js` two-of-each deck, true
  Fisher–Yates shuffle and timed mismatch reset; pair counts vary with tier.
- STRIKE: MIT OpenGames Whac-A-Mole `whac-a-mole/game.js` uniform nonrepeat
  target spawn and progressively shortening reaction window; Ghost's existing
  application tick (not a second clock) advances moving targets.

The local engine wrappers live in `arcade-upstream.js` and
`vendor/puzzle-slide.js`, with full upstream MIT notices preserved in
`vendor/OPEN_SOURCE_LICENSES.md`. No third-party page, runtime network call,
iframe, media asset or separate game store is added. Source attribution and
licenses apply only to credited ports, not the rest of the repository.

**Activation:** newly begun D15–D55 authored Ghost stages set
`arcadeV3: true`. Earlier storyline stages, old saved boards and previously
running attempts preserve their existing play and checkpoint logic.
LINK/Pipe Puzzle was deliberately untouched, as requested.
