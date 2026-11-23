// Fast answers to *explicit recall questions* about author-confirmed, lived events.
// This is a read-only view of NoApp story messages and the existing Story55 gate.
// Do not add generic romance, tactical advice, unseen events or future outcomes here.
import {isStory55,taiRecognized} from '../../services/story55/state.js';
import {taiDirectTearDefinition} from '../../services/ai/worldbook/plot-glossary.js';

const normalize=value=>String(value||'').normalize('NFKC').replace(/[\s，,。！？!?、：:；;“”「」『』]/g,'').toLowerCase();
const existingLine=(messages,phrase,speaker='tai')=>messages.find(m=>
 m?.actual!==false&&!m?.demo&&m?.from===speaker&&
 /^s55-d53-tai-night-\d+$/.test(String(m.id||''))&&String(m.text||'').includes(phrase)
)?.text||'';

export function selectTaiMemoryPreset(s,input,{history=null}={}){
 if(!isStory55(s)||!taiRecognized(s)||s.story55?.ended)return null;
 const raw=String(input||'').trim();
 if(!raw||raw.length>110||/[\n\r]/.test(raw))return null;
 const text=normalize(raw);
 // Unambiguous question about a named, canonically defined program: do not
 // depend on DeepSeek recalling the title or confusing TAI with Xi Tai.
 const programFact=taiDirectTearDefinition(s,raw);
 if(programFact)return programFact;
 const messages=history||s.content?.conversations?.noapp?.find(c=>c.id==='tai')?.messages||[];
 // A direct question about a past fact is safe to answer verbatim. General
 // questions ("what now?", "what happened?") still need live reasoning.
 const recall=/(?:還記得|还记得|記得嗎|记得吗|記不記得|记不记得|還算數|还算数|之前說|之前说|你說過|你说过|答應過|答应过)/.test(text);
 const hasNewProblem=/(?:現在|现在|怎麼辦|怎么办|接下來|接下来|出事|失敗|失败|改變|改变|變了|变了|怎麼救|怎么救|為什麼|为什么)/.test(text);
 if(hasNewProblem)return null;

 const rescued=existingLine(messages,'只要你還活著');
 if(rescued&&recall&&/(?:救我|救出來|救出来|救出去|活著|活着|救你|救命)/.test(text))
  return {id:'d53-rescue-promise',text:rescued};

 const gift=existingLine(messages,'手辦已經包好了');
 if(gift&&s.day<=54&&recall&&/(?:手辦|手办|傑克|杰克|伴手禮|伴手礼)/.test(text))
  return {id:'d53-jack-gift',text:gift};

 const briefing=s.story55?.scenes?.['d55-briefing'];
 const wynnReady=s.day===55&&(Number(briefing?.index)>=5||!!s.story55?.completed?.['d55-briefing']);
 if(wynnReady&&/(?:永利皇宮|永利皇宫|永利)/.test(text)&&recall&&/(?:計劃|计划|撤離|撤离|離開|离开|撤展|永利)/.test(text))
  return {id:'d55-wynn-recall',text:'原本的計劃是十點前到永利皇宮，混進撤展隊伍，離開澳門。'};

 return null;
}

// A single remembered answer should not loop verbatim through repeated turns.
// The next occurrence falls back to the existing worldbook + DeepSeek path.
export function alreadyRecentlyUsedTaiPreset(messages=[],presetId){
 return messages.slice(-12).some(m=>m?.from==='tai'&&m.aiPresetId===presetId);
}
