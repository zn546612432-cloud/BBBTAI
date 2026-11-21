import {hasBannedTaiReassurance} from './expression-style.js';

// Keep the existing dialogue quality guard; no game-side daily counters,
// unlock commands, or clip reservations govern voice generation.
export async function synthesizeTaiVoice(options,synthesize){
 if(hasBannedTaiReassurance([options.text]))throw Object.assign(Error('Blocked dialogue'),{code:'TAI_STYLE'});
 return synthesize(options);
}
