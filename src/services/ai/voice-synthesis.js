import {hasBannedTaiReassurance} from './expression-style.js';
import {withTaiSocialVoice} from './social-energy.js';

// Only new live speech consumes private energy, never cached/authored replay.
export async function synthesizeTaiVoice(options,synthesize,{store,kind}={}){
 if(hasBannedTaiReassurance([options.text]))throw Object.assign(Error('Blocked dialogue'),{code:'TAI_STYLE'});
 return store&&kind?withTaiSocialVoice(store,kind,()=>synthesize(options)):synthesize(options);
}
