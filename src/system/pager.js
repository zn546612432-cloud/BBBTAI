// Pure helpers for the home-screen pager: finger-follow offsets, edge resistance and
// iOS-like page targeting (distance + flick velocity). No DOM access, so they are unit-tested.

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

// Fraction of a page the user must drag, after adding coast distance, before the page turns.
export const TURN_FRACTION = 0.33;
// How far (ms of current finger velocity) the pager is assumed to coast after release.
export const COAST_MS = 220;

// iOS-style rubber band: resistance grows smoothly and never exceeds `dimension`.
export function rubberBand(overshoot, dimension, coefficient = 0.55) {
  if (!overshoot || !dimension) return 0;
  const distance = Math.abs(overshoot);
  return Math.sign(overshoot) * (1 - 1 / ((distance * coefficient) / dimension + 1)) * dimension;
}

// Track offset (px, 0 .. -(count-1)*width) while dragging, with rubber band beyond both ends.
export function dragOffset({ base, dx, width, count }) {
  const min = -(Math.max(1, count) - 1) * width;
  const raw = base + dx;
  if (raw > 0) return rubberBand(raw, width);
  if (raw < min) return min + rubberBand(raw - min, width);
  return raw;
}

export function nearestPage(offset, width, count) {
  if (!width) return 0;
  return clamp(Math.round(-offset / width), 0, Math.max(1, count) - 1);
}

// Page to settle on. `from` is the page the drag started from. A gesture moves at most one page.
export function pageTarget({ from, offset, velocity = 0, width, count }) {
  if (!width) return clamp(from, 0, Math.max(1, count) - 1);
  const projected = offset + velocity * COAST_MS;
  const progress = -projected / width - from; // > 0: toward the next page
  const step = progress >= TURN_FRACTION ? 1 : progress <= -TURN_FRACTION ? -1 : 0;
  return clamp(from + step, 0, Math.max(1, count) - 1);
}

// Finger velocity (px/ms) from recent pointer samples [{x, t}]; 0 if the finger paused before release.
export function releaseVelocity(samples, releaseTime) {
  if (!samples || samples.length < 2) return 0;
  const last = samples[samples.length - 1];
  if (releaseTime - last.t > 80) return 0;
  const first = samples.find((s) => last.t - s.t <= 100) || samples[0];
  const span = last.t - first.t;
  return span > 0 ? (last.x - first.x) / span : 0;
}
