# BOARD
Initial D01 app shell. Empty physical-style glass board, player notes, drag via pin, native scroll, zoom buttons, existing phone save. No authored story data yet.
- `state.js`: board-owned content under `content.board` in the shared save.
- `drag.js`: pointer interaction scoped to board notes.
- Future: event-gated authored assets, source links, shared search/save integration, pinch zoom and custom links. Do not create a second story clock or persistence store.
