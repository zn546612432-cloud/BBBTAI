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
