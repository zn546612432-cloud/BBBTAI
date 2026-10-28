// Browser-local record IDs, including HTTP previews where randomUUID is absent.
export const uid=(cryptoApi=globalThis.crypto)=>cryptoApi?.randomUUID?.()||`local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,12)}`;
