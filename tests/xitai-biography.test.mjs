import test from 'node:test';
import assert from 'node:assert/strict';
import {XITAI_BIOGRAPHY,XITAI_BIOGRAPHY_SUMMARY,XITAI_BIOGRAPHY_PRIORITY} from '../src/services/ai/character-biography.js';
import {XITAI_LONG_WORLDBOOK} from '../src/services/ai/character-worldbook.js';
import {buildTaiPrompt,defaultTaiDraft,ensureTaiDraft} from '../src/services/ai/tai-profile.js';
import {taiActionDecisionPrompt} from '../src/services/ai/action-protocol-v10.js';

test('all confirmed biographical facts are present in the single canon',()=>{
 for(const fact of ['葡萄牙人','母語是葡萄牙本土葡萄牙語和英語','被生母遺棄在澳門的孤兒院','one more time','三個月大的熙泰','養父是使館領事','養母是律師','十三歲時','蘋果筆記型電腦','葡萄牙私立學校','馬術、拳擊','Imperial College London','Harvard University','篡改成績賺錢','Azathoth 招攬','現任管理人','共同創立 MIRAGE','義大利黑手黨','二十億懸賞','一艘艦艇','公海','黑客團隊及僱傭兵','愛乾淨','武力值很高','每個人都可以被利用','忍不住想接近哥哥、對哥哥好'])assert.ok(XITAI_BIOGRAPHY.includes(fact),fact);
 assert.ok(XITAI_LONG_WORLDBOOK.includes(XITAI_BIOGRAPHY));
});

test('both intent and dialogue learn the canon without unlocking early identity',()=>{
 const early={day:15,channel:'mirage',recognized:false,messages:[{role:'user',content:'你到底是誰？'}]};
 const late={day:40,channel:'noapp',recognized:true,messages:[{role:'user',content:'小時候你在哪裡讀書？'}]};
 for(const input of [early,late]){
  const decision=taiActionDecisionPrompt(input);
  assert.ok(decision.includes(XITAI_BIOGRAPHY));assert.ok(decision.includes(XITAI_BIOGRAPHY_PRIORITY));
  for(const outputMode of ['text','voice','call']){
   const prompt=buildTaiPrompt({...input,outputMode,approvedPersona:'older approved persona'});
   assert.ok(prompt.includes(XITAI_BIOGRAPHY));
   assert.ok(prompt.indexOf('older approved persona')<prompt.indexOf(XITAI_BIOGRAPHY_PRIORITY));
   assert.match(prompt,input.recognized?/公开范围：已经通过剧情相认/:/公开范围：尚未相认/);
   assert.match(prompt,/未相認時.*依當前劇情證據逐項公開/);
   assert.match(prompt,/主語在語境清楚時可以省略/);
  }
 }
});

test('existing saves migrate only the earlier shipped identity and relationship defaults',()=>{
 const draft=defaultTaiDraft();
 draft.profile.identity='陈熙泰是衔尾蛇博士与MIRAGE管理者，被西方家庭收养，接受哈佛计算机博士教育，常居英国／葡萄牙。私下早已知道三胞胎关系，公开身份必须由调查证据与相认事件解锁。55天主线不再使用旧固定相认日。';
 draft.profile.relationship='渴望亲情与爱却绝不低头乞求，敢表达但带着刺。关心多包装成投资和效率，可以较量、施压、争执；不替熙蒙作决定，不虚构他已经服从。记得熙旺身份及真实约定，不能编造三人共同成长。';
 draft.profile.speech='作者手動設定';draft.memories=[{text:'memory'}];
 const state={aiDraft:draft};const memories=draft.memories;
 assert.equal(ensureTaiDraft(state),true);assert.ok(draft.profile.identity.includes(XITAI_BIOGRAPHY_SUMMARY));
 assert.match(draft.profile.relationship,/熙蒙是例外/);assert.equal(draft.profile.speech,'作者手動設定');assert.equal(draft.memories,memories);
 draft.profile.identity='作者自訂履歷補充';assert.equal(ensureTaiDraft(state),false);assert.equal(draft.profile.identity,'作者自訂履歷補充');
});
