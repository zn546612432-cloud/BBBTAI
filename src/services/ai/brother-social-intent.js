// Shared social direction, not a canned-reply table. No changes to authored plot.
const directions={
 affection:'親兄弟之間撒嬌、討寵或故意霸道。把親密關係當既定背景。可以順著寵、爭寵、輕鬆吐槽或假裝敷衍，不辯論愛的定義，不談強迫、權利、規定。熙旺可以很自然地縱容弟弟，小辛可以積極表達喜歡；其他人有自己的反應。',
 banter:'兄弟之間的惡搞、臭美或玩梗。順著梗玩、反過來逗他、抓字眼、接前一條消息。不要把玩笑當成正式指控、命令或需要糾正的觀念。',
 vent:'熟人之間抱怨或情緒宣洩。先接住情緒，可以附和、關心、問具體事情或輕鬆調侃，不全員審問。若涉及乾爹，熙旺可以有不同態度，但不必立刻訓人。',
 serious:'當前內容確有求助、受傷、危險或認真討論的信號。讓合適的人自然關心或商量，不用心靈雞湯，不預設具體原因。',
 share:'日常分享或普通閒聊。挑感興趣的人接話，允許表情、短句、調侃、認真感想或沉默。'
};
export function socialIntent(value){
 const text=String(value||'').trim();
 if(/救命|受傷|受伤|流血|出事了|撐不住|撑不住|怎麼辦|怎么办|好難過|好难过|想哭/.test(text))return 'serious';
 if(/(?:喜歡|喜欢|愛|爱|想念|想我|抱抱|寵|宠)(?:我|你們|你们|哥|蒙蒙)|(?:我|蒙蒙).*(?:最可愛|最可爱|最帥|最帅|最漂亮)|(?:不許|不许|必須|必须|只能|都要).*(?:喜歡|喜欢|愛|爱|想我|寵|宠)|(?:好想|想死).*(?:你|哥)|(?:喜歡|喜欢)你/.test(text))return 'affection';
 if(/gay|笨蛋|傻瓜|豬|猪|帥|帅|漂亮|最強|最强|世界第一|你們是|你们是|哈哈|嘿嘿|臭美/i.test(text))return 'banter';
 if(/討厭|讨厌|煩|烦|氣死|气死|不理|生氣|生气|無語|无语|累死/.test(text))return 'vent';
 return 'share';
}
export function socialDirection(value){const intent=socialIntent(value);return {intent,direction:directions[intent]};}
// First public disclosure is not evidence of earlier knowledge. Reject the observed false-history replies.
export function socialKnowledgeIssues(rows,topic){
 if(!/原[來来].{0,5}(?:我|熙蒙).{0,5}三胞胎/.test(String(topic||'')))return [];
 const claims=/(?:早就|一直|本[來来]|之前|早都|早已).{0,8}(?:知道|知情|[發发][現现])|反射弧|後知後覺|后知后觉|才知道|早知道|知道[啊呀阿]|我知道/;
 return (Array.isArray(rows)?rows:[]).some(r=>['胡枫','胡楓','阿威','小辛','仔仔'].includes(r?.by)&&claims.test(String(r.text||'')))?['把首次公開誤當成早已知情']:[];
}
export function socialQualityIssues(rows,topic){
 const intent=socialIntent(topic);
 const casual=intent!=='serious';
 if(!Array.isArray(rows))return ['格式錯誤'];
 const issues=socialKnowledgeIssues(rows,topic);
 const patterns=[/不是.{0,24}[，。； ]*(?:而是|是規定|是命令|是強迫)/,/是.{1,22}出來的[。！？！？，、 ]*不是/,/不是.{0,18}點菜|點什麼來什麼/,/特地發.{0,18}(?:是想|想讓)|這話語氣像在發公告|這種話別在群裡說/,/先把.{0,12}收回去|明天.{0,8}(?:飯桌|吃飯).{0,8}當面/];
 for(const row of rows){const t=String(row?.text||'');if(casual&&patterns.some(r=>r.test(t)))issues.push('說教或模板句');if(casual&&intent==='affection'&&/喜歡.{0,18}(?:強求|強迫|規定|命令|相處出來|自由選擇)|(?:尊重|強迫|強求).{0,12}(?:感情|喜歡|愛)/.test(t))issues.push('把撒嬌誤作道德問題');}
 return [...new Set(issues)];
}
export function socialRetryMessages(messages){
 return messages.map((m,i)=>i===0?{...m,content:m.content+'\n【品質重試】上一輪過於說教或像模板。重新理解社交情境，用兄弟自然接話的方式全新生成；不要引用或解釋上一輪。允許少回或不回，仍只輸出指定JSON。'}:m);
}
export const SOCIAL_THINKING={model:'deepseek-v4-pro',socialThinking:true,reasoning_effort:'low',max_tokens:2800};
