// An explicit empty steps array means that a restored scripted call has
// already played its fixed dialogue. Do not fall back to missing `lines`.
export function scriptedCallIsComplete(script, index = 0) {
  const length = Array.isArray(script?.steps)
    ? script.steps.length
    : Array.isArray(script?.lines) ? script.lines.length : 0;
  return Number(index) >= length;
}
