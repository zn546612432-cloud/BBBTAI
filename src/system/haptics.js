// Best-effort haptic feedback for the local UI. Never throws and never blocks the interface.
//  - Android / Chromium: Vibration API.
//  - iOS Safari has no Vibration API; since 17.4 it plays a light tap when an <input switch> is
//    toggled from a user gesture, so we click a throw-away switch a few times instead.
//  - Browsers with neither simply do nothing.

function switchTap(doc) {
  try {
    const label = doc.createElement('label');
    label.setAttribute('aria-hidden', 'true');
    label.style.display = 'none';
    const input = doc.createElement('input');
    input.type = 'checkbox';
    input.setAttribute('switch', '');
    label.append(input);
    doc.head.append(label);
    label.click();
    label.remove();
    return true;
  } catch {
    return false;
  }
}

// iOS-like "wrong passcode": three short pulses. Returns which mechanism was used.
export function errorHaptic({ nav = globalThis.navigator, doc = globalThis.document, wait = setTimeout } = {}) {
  try {
    if (nav && typeof nav.vibrate === 'function') {
      nav.vibrate([45, 55, 45, 55, 45]);
      return 'vibrate';
    }
  } catch {
    // fall through to the switch trick
  }
  if (!doc || !doc.head) return 'none';
  switchTap(doc);
  wait(90, () => switchTap(doc));
  wait(180, () => switchTap(doc));
  return 'switch';
}
