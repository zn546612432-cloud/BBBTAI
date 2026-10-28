// Local UI passcode only; never use this controller for server authorization.
export class LockScreen {
  constructor() { this.reset(); }
  reset() { this.stage = 'cover'; this.digits = ''; this.pendingLink = null; }
  open(link = null) { this.stage = 'passcode'; this.digits = ''; this.pendingLink = link; }
  cancel() { this.reset(); }
  key(key,passcode='0816') {
    if (this.stage !== 'passcode') return 'ignored';
    if (key === 'cancel') { this.cancel(); return 'cancelled'; }
    if (key === 'erase') { this.digits = this.digits.slice(0, -1); return 'changed'; }
    if (!/^\d$/.test(String(key))) return 'ignored';
    this.digits += key;
    if (this.digits.length < 4) return 'changed';
    this.stage = this.digits === passcode ? 'unlocking' : 'error';
    return this.stage;
  }
  retry() { if (this.stage === 'error') { this.stage = 'passcode'; this.digits = ''; } }
}
