/** Speak visible text through the device's built-in speech engine. No remote API is used. */
export function speakWeChatText(text,options={}){
  const content=String(text||'').trim();
  if(!content)throw Error('没有可朗读的文字');
  const engine=options.engine??globalThis.speechSynthesis;
  const Utterance=options.Utterance??globalThis.SpeechSynthesisUtterance;
  if(!engine||!Utterance||typeof engine.speak!=='function')throw Error('当前浏览器暂不支持文字转语音');
  engine.cancel?.();
  const voice=new Utterance(content);
  voice.lang=/[\u3400-\u9fff]/.test(content)?'zh-CN':'en-US';
  voice.rate=.95;
  voice.pitch=1;
  engine.speak(voice);
  return voice;
}

export function stopWeChatSpeech(engine=globalThis.speechSynthesis){engine?.cancel?.();}
