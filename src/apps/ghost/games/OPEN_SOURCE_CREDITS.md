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
