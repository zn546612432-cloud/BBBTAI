// The friends test reuses the production game build and its media.
// Only its dedicated entry HTML opts into hiding author controls.
export const isFriendsTest=globalThis.document?.querySelector?.('meta[name="phone-friends-test"]')?.content==='true';
