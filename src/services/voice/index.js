import {voicePreview} from '../ai/gateway.js';

// Compatibility adapter for phone playback. API keys remain exclusively on the local server.
// The old browser-side accessToken option was intentionally removed.
export class MiniMaxVoiceAdapter {
  constructor(config={}){this.config=config;}
  async synthesize(text,options={}) {
    if(typeof text!=='string'||!text.trim())throw Error('没有可朗读的文字');
    return voicePreview({...this.config,...options,text});
  }
}
